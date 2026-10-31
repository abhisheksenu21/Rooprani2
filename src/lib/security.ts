import crypto from 'node:crypto';

const SESSION_PREFIX = 'rpr_v1.';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function isSessionSecretConfigured(): boolean {
  return Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16);
}

function getServerSigningSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }

  // Deterministic across Vercel Serverless Function cold starts & Cloud Run replicas
  const envSeed = [
    process.env.DATABASE_URL || '',
    process.env.POSTGRES_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    process.env.SQL_PASSWORD || '',
    process.env.SQL_HOST || '',
    process.env.SQL_DB_NAME || '',
    process.env.SUPABASE_URL ||
      process.env.VITE_SUPABASE_URL ||
      'https://gszzzhfzysxtjncmbkjc.supabase.co',
    process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      'sb_publishable_VWVwWVIi7WrHY6TOs_DSaA_vKpUMinh',
  ].join(':');

  return crypto.createHash('sha256').update(`rooprani-auth-hmac-v2:${envSeed}`).digest('hex');
}

export function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  if (!plainPassword || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;

  try {
    const actualBuf = crypto.scryptSync(plainPassword, salt, 64);
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (actualBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, expectedBuf);
  } catch {
    return false;
  }
}

export interface SessionTokenPayload {
  uid: string;
  email: string;
  role: string;
  fullName?: string | null;
  phone?: string | null;
  supabaseUserId?: string | null;
  iat: number;
  exp: number;
}

export function createSignedSessionToken(params: {
  uid: string;
  email: string;
  role: string;
  fullName?: string | null;
  phone?: string | null;
  supabaseUserId?: string | null;
}): string {
  const now = Date.now();
  const payload: SessionTokenPayload = {
    uid: params.uid,
    email: params.email.toLowerCase().trim(),
    role: params.role,
    fullName: params.fullName ?? null,
    phone: params.phone ?? null,
    supabaseUserId: params.supabaseUserId ?? null,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sigB64 = crypto
    .createHmac('sha256', getServerSigningSecret())
    .update(payloadB64)
    .digest('base64url');

  return `${SESSION_PREFIX}${payloadB64}.${sigB64}`;
}

export function verifySignedSessionToken(token: string): SessionTokenPayload | null {
  if (!token || !token.startsWith(SESSION_PREFIX)) return null;
  const raw = token.slice(SESSION_PREFIX.length);
  const dotIndex = raw.indexOf('.');
  if (dotIndex <= 0) return null;

  const payloadB64 = raw.slice(0, dotIndex);
  const sigB64 = raw.slice(dotIndex + 1);
  if (!payloadB64 || !sigB64) return null;

  const expectedSigB64 = crypto
    .createHmac('sha256', getServerSigningSecret())
    .update(payloadB64)
    .digest('base64url');

  try {
    const actualBuf = Buffer.from(sigB64, 'utf8');
    const expectedBuf = Buffer.from(expectedSigB64, 'utf8');
    if (actualBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(actualBuf, expectedBuf)) return null;

    const decoded = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    ) as SessionTokenPayload;

    if (!decoded.uid || !decoded.email || typeof decoded.exp !== 'number') {
      return null;
    }
    if (decoded.exp <= Date.now()) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
