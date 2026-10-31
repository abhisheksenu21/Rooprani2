import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema.ts';

export type PostgresConnectionSource =
  | 'DATABASE_URL'
  | 'POSTGRES_URL'
  | 'SUPABASE_DB_URL'
  | 'POSTGRES_URL_NON_POOLING'
  | 'CLOUD_SQL'
  | 'NONE';

declare global {
  var _postgresPool: Pool | undefined;
  var _drizzleDb: NodePgDatabase<typeof schema> | undefined;
  var _postgresSchemaInitPromise: Promise<void> | undefined;
  var _postgresVerifiedResolved:
    | {
        source: PostgresConnectionSource;
        connectionString?: string;
        verifiedAt: number;
      }
    | undefined;
  var _postgresVerifyPromise:
    | Promise<{
        source: PostgresConnectionSource;
        connectionString?: string;
      }>
    | undefined;
}

interface PostgresCandidate {
  source: Exclude<PostgresConnectionSource, 'NONE'>;
  connectionString?: string;
  isDirectSupabaseIpv6?: boolean;
}

function getTrimmedEnv(key: string): string {
  const val = process.env[key];
  return typeof val === 'string' ? val.trim().replace(/^['"]+|['"]+$/g, '').trim() : '';
}

function isValidPostgresUrlCandidate(raw: string): boolean {
  if (!raw) return false;
  if (!/^postgres(ql)?:\/\//i.test(raw)) return false;
  if (/\[your-password\]|<password>|your_password|placeholder|example\.com/i.test(raw)) {
    return false;
  }
  return true;
}

function isDirectSupabaseIpv6Host(connectionString: string): boolean {
  try {
    const parsed = new URL(connectionString);
    return /^db\.[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname);
  } catch {
    return /@db\.[a-z0-9-]+\.supabase\.co[:/]/i.test(connectionString);
  }
}

function shouldEnableSslForUrl(connectionString: string): boolean {
  if (getTrimmedEnv('SQL_SSL') === 'false') return false;
  if (getTrimmedEnv('SQL_SSL') === 'true') return true;
  const lower = connectionString.toLowerCase();
  if (
    lower.includes('localhost') ||
    lower.includes('127.0.0.1') ||
    lower.includes('sslmode=disable')
  ) {
    return false;
  }
  return true;
}

function buildPoolConfigForCandidate(
  candidate: PostgresCandidate,
  connectionTimeoutMs?: number
): PoolConfig {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (candidate.connectionString) {
    return {
      connectionString: candidate.connectionString,
      ssl: shouldEnableSslForUrl(candidate.connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
      max: isServerless ? 3 : 10,
      idleTimeoutMillis: isServerless ? 10000 : 30000,
      connectionTimeoutMillis: connectionTimeoutMs ?? 5000,
      allowExitOnIdle: isServerless,
    };
  }

  return {
    host: getTrimmedEnv('SQL_HOST'),
    port: Number(getTrimmedEnv('SQL_PORT')) || 5432,
    user: getTrimmedEnv('SQL_USER'),
    password: process.env.SQL_PASSWORD || '',
    database: getTrimmedEnv('SQL_DB_NAME'),
    ssl: getTrimmedEnv('SQL_SSL') === 'true' ? { rejectUnauthorized: false } : undefined,
    max: isServerless ? 3 : 10,
    idleTimeoutMillis: isServerless ? 10000 : 30000,
    connectionTimeoutMillis: connectionTimeoutMs ?? 6000,
    allowExitOnIdle: isServerless,
  };
}

function getOrderedPostgresCandidates(): PostgresCandidate[] {
  const urlSources: Array<{
    source: Exclude<PostgresConnectionSource, 'NONE' | 'CLOUD_SQL'>;
    value: string;
  }> = [
    { source: 'DATABASE_URL', value: getTrimmedEnv('DATABASE_URL') },
    { source: 'POSTGRES_URL', value: getTrimmedEnv('POSTGRES_URL') },
    { source: 'SUPABASE_DB_URL', value: getTrimmedEnv('SUPABASE_DB_URL') },
    {
      source: 'POSTGRES_URL_NON_POOLING',
      value: getTrimmedEnv('POSTGRES_URL_NON_POOLING'),
    },
  ];

  const seenUrls = new Set<string>();
  const standardUrlCandidates: PostgresCandidate[] = [];
  const directIpv6UrlCandidates: PostgresCandidate[] = [];

  for (const item of urlSources) {
    if (!isValidPostgresUrlCandidate(item.value)) continue;
    if (seenUrls.has(item.value)) continue;
    seenUrls.add(item.value);

    const isDirectIpv6 = isDirectSupabaseIpv6Host(item.value);
    const candidate: PostgresCandidate = {
      source: item.source,
      connectionString: item.value,
      isDirectSupabaseIpv6: isDirectIpv6,
    };

    if (isDirectIpv6) {
      directIpv6UrlCandidates.push(candidate);
    } else {
      standardUrlCandidates.push(candidate);
    }
  }

  const sqlHost = getTrimmedEnv('SQL_HOST');
  const sqlUser = getTrimmedEnv('SQL_USER');
  const sqlDbName = getTrimmedEnv('SQL_DB_NAME');
  const hasCloudSql = Boolean(sqlHost && sqlUser && sqlDbName);
  const cloudSqlCandidate: PostgresCandidate | null = hasCloudSql
    ? { source: 'CLOUD_SQL' }
    : null;

  // Prefer IPv4-capable pooler/external URLs first, then local Cloud SQL Unix socket,
  // and try direct IPv6-only Supabase host (`db.<ref>.supabase.co`) last so IPv4-only
  // Cloud Run / Vercel containers never stall or fail before reaching a healthy backend.
  const ordered: PostgresCandidate[] = [...standardUrlCandidates];
  if (cloudSqlCandidate) {
    ordered.push(cloudSqlCandidate);
  }
  ordered.push(...directIpv6UrlCandidates);

  return ordered;
}

async function probePoolConnectivity(pool: Pool, timeoutMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`PostgreSQL connection probe timed out after ${timeoutMs}ms`)),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Probes configured PostgreSQL candidates once per cold start (with fast failure
 * recovery) and caches the live pool. If all PostgreSQL candidates are unreachable
 * (for example, an IPv6-only `db.<ref>.supabase.co:5432` URL on an IPv4 serverless
 * runtime), falls back cleanly to `NONE` so the application automatically serves
 * via Supabase HTTPS Cloud (`https://<ref>.supabase.co`) with zero 500 errors.
 */
export async function ensurePostgresVerified(): Promise<{
  source: PostgresConnectionSource;
  connectionString?: string;
}> {
  const candidates = getOrderedPostgresCandidates();
  if (candidates.length === 0) {
    global._postgresVerifiedResolved = {
      source: 'NONE',
      verifiedAt: Date.now(),
    };
    return { source: 'NONE' };
  }

  const cached = global._postgresVerifiedResolved;
  if (cached) {
    // Keep verified live connection indefinitely; re-check failed candidates only after 60s
    if (cached.source !== 'NONE' && global._postgresPool) {
      return {
        source: cached.source,
        connectionString: cached.connectionString,
      };
    }
    if (cached.source === 'NONE' && Date.now() - cached.verifiedAt < 60_000) {
      return { source: 'NONE' };
    }
  }

  if (!global._postgresVerifyPromise) {
    global._postgresVerifyPromise = (async () => {
      for (const candidate of candidates) {
        const probeTimeoutMs = candidate.isDirectSupabaseIpv6
          ? 2000
          : candidate.source === 'CLOUD_SQL'
            ? 5000
            : 3000;

        const candidatePool = new Pool(
          buildPoolConfigForCandidate(candidate, probeTimeoutMs)
        );
        candidatePool.on('error', (err) => {
          console.error('Unexpected error on idle SQL pool client:', err.message);
        });

        try {
          await probePoolConnectivity(candidatePool, probeTimeoutMs + 300);

          if (global._postgresPool && global._postgresPool !== candidatePool) {
            void global._postgresPool.end().catch(() => undefined);
          }
          global._postgresPool = candidatePool;
          global._drizzleDb = drizzle(candidatePool, { schema });
          global._postgresVerifiedResolved = {
            source: candidate.source,
            connectionString: candidate.connectionString,
            verifiedAt: Date.now(),
          };

          return {
            source: candidate.source,
            connectionString: candidate.connectionString,
          };
        } catch (err) {
          const code = (err as { code?: string })?.code || '';
          const message = err instanceof Error ? err.message : String(err);
          console.warn(
            `[db] Skipping unreachable PostgreSQL source ${candidate.source}${code ? ` (${code})` : ''}: ${message}`
          );
          void candidatePool.end().catch(() => undefined);
        }
      }

      console.warn(
        '[db] No reachable direct PostgreSQL connection; activating Supabase HTTPS Cloud mode.'
      );
      global._postgresVerifiedResolved = {
        source: 'NONE',
        verifiedAt: Date.now(),
      };
      return { source: 'NONE' as const };
    })().finally(() => {
      global._postgresVerifyPromise = undefined;
    });
  }

  return global._postgresVerifyPromise;
}

export function resolvePostgresConnectionSource(): {
  source: PostgresConnectionSource;
  connectionString?: string;
} {
  if (global._postgresVerifiedResolved) {
    return {
      source: global._postgresVerifiedResolved.source,
      connectionString: global._postgresVerifiedResolved.connectionString,
    };
  }

  const candidates = getOrderedPostgresCandidates();
  if (candidates.length === 0) {
    return { source: 'NONE' };
  }
  return {
    source: candidates[0].source,
    connectionString: candidates[0].connectionString,
  };
}

export function hasPostgresConfig(): boolean {
  return resolvePostgresConnectionSource().source !== 'NONE';
}

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    const resolved = resolvePostgresConnectionSource();
    if (resolved.source === 'NONE') {
      throw new Error(
        'PostgreSQL is not configured in this environment. Set DATABASE_URL, POSTGRES_URL, or use Supabase Cloud mode.'
      );
    }

    const config = buildPoolConfigForCandidate({
      source: resolved.source,
      connectionString: resolved.connectionString,
    });

    global._postgresPool = new Pool(config);
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err.message);
    });
  }
  return global._postgresPool;
};

export function getDb(): NodePgDatabase<typeof schema> {
  if (!global._drizzleDb) {
    global._drizzleDb = drizzle(createPool(), { schema });
  }
  return global._drizzleDb;
}

// Lazy proxy so legacy `db.select()...` calls work seamlessly without eager socket connections on import
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

/**
 * Ensures all PostgreSQL tables and indexes exist when connected to an external
 * Vercel Postgres / Neon / Supabase DATABASE_URL for the first time.
 * Safe and idempotent on existing databases.
 */
export async function ensurePostgresSchemaInitialized(): Promise<void> {
  if (!hasPostgresConfig()) return;
  const resolved = resolvePostgresConnectionSource();
  // AI Studio Cloud SQL schema is managed via drizzle-kit / UpdateSchema; only run DDL bootstrap on external URLs
  if (resolved.source === 'CLOUD_SQL') return;

  if (!global._postgresSchemaInitPromise) {
    global._postgresSchemaInitPromise = (async () => {
      const pool = createPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          uid TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          password_hash TEXT,
          supabase_user_id TEXT,
          full_name TEXT,
          phone TEXT,
          role TEXT NOT NULL DEFAULT 'customer',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          title TEXT NOT NULL DEFAULT '',
          name TEXT NOT NULL,
          slug TEXT NOT NULL UNIQUE,
          description TEXT NOT NULL,
          price_inr INTEGER NOT NULL,
          sku TEXT,
          image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
          finish TEXT,
          sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
          availability_status TEXT NOT NULL DEFAULT 'available',
          is_published BOOLEAN NOT NULL DEFAULT TRUE,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          is_featured BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);
        CREATE INDEX IF NOT EXISTS products_is_published_idx ON products (is_published);
        CREATE INDEX IF NOT EXISTS products_availability_status_idx ON products (availability_status);

        CREATE TABLE IF NOT EXISTS enquiries (
          id SERIAL PRIMARY KEY,
          user_uid TEXT REFERENCES users(uid),
          product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
          product_name TEXT NOT NULL,
          product_price_inr INTEGER,
          product_sku TEXT,
          customer_name TEXT NOT NULL,
          customer_phone TEXT NOT NULL,
          customer_email TEXT NOT NULL,
          preferred_size TEXT,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'new',
          supabase_synced BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS media_assets (
          id SERIAL PRIMARY KEY,
          filename TEXT NOT NULL,
          mime_type TEXT NOT NULL,
          data_base64 TEXT NOT NULL,
          size_bytes INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
    })().catch((err) => {
      global._postgresSchemaInitPromise = undefined;
      console.error('Error bootstrapping PostgreSQL schema:', err);
    });
  }

  await global._postgresSchemaInitPromise;
}

export async function checkPostgresHealth(): Promise<{
  configured: boolean;
  source: PostgresConnectionSource;
  connected: boolean;
}> {
  const verified = await ensurePostgresVerified();
  if (verified.source === 'NONE') {
    return { configured: false, source: 'NONE', connected: false };
  }
  try {
    const pool = createPool();
    await probePoolConnectivity(pool, 3000);
    return { configured: true, source: verified.source, connected: true };
  } catch {
    return { configured: true, source: verified.source, connected: false };
  }
}
