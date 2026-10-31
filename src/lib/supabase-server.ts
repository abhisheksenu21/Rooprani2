import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { SUPABASE_MIGRATION_SQL } from '../db/supabaseMigrationSql.ts';

const DEFAULT_SUPABASE_URL = 'https://gszzzhfzysxtjncmbkjc.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_VWVwWVIi7WrHY6TOs_DSaA_vKpUMinh';

function normalizeServerSupabaseUrl(candidates: Array<string | undefined>): string {
  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, '').trim();
    if (!cleaned || /^my_|^your_|placeholder|example|<|>/i.test(cleaned)) {
      continue;
    }

    let candidateUrl = cleaned;
    // Automatically upgrade a bare Supabase project ID (e.g. "gszzzhfzysxtjncmbkjc") to its HTTPS URL
    if (/^[a-z0-9]{15,32}$/i.test(cleaned)) {
      candidateUrl = `https://${cleaned.toLowerCase()}.supabase.co`;
    } else if (!/^https?:\/\//i.test(cleaned) && /\.supabase\.co(\/|$)/i.test(cleaned)) {
      candidateUrl = `https://${cleaned}`;
    }

    try {
      const parsed = new URL(candidateUrl);
      if (
        (parsed.protocol === 'https:' || parsed.protocol === 'http:') &&
        parsed.hostname.includes('.')
      ) {
        return parsed.origin;
      }
    } catch {
      // Try next candidate
    }
  }
  return DEFAULT_SUPABASE_URL;
}

function isValidPublishableOrAnonKey(key: string): boolean {
  return (
    /^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(key) ||
    /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)
  );
}

function isValidServiceRoleOrSecretKey(key: string): boolean {
  if (!key || /^my_|^your_|placeholder|example|<|>/i.test(key)) {
    return false;
  }
  if (/^sb_secret_[A-Za-z0-9_-]{12,}$/.test(key)) {
    return true;
  }
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) {
    try {
      const payloadJson = Buffer.from(key.split('.')[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson) as { role?: string };
      return payload?.role === 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

function normalizeServerSupabaseKey(candidates: Array<string | undefined>): string {
  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, '').trim();
    if (
      cleaned.length >= 20 &&
      !/^my_|^your_|placeholder|example|<|>/i.test(cleaned) &&
      isValidPublishableOrAnonKey(cleaned)
    ) {
      return cleaned;
    }
  }
  return DEFAULT_SUPABASE_PUBLISHABLE_KEY;
}

export const SERVER_SUPABASE_URL = normalizeServerSupabaseUrl([
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.VITE_SUPABASE_URL,
]);

export const SERVER_SUPABASE_PROJECT_ID =
  SERVER_SUPABASE_URL.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co$/i)?.[1] ||
  'gszzzhfzysxtjncmbkjc';

export const SERVER_SUPABASE_KEY = normalizeServerSupabaseKey([
  process.env.SUPABASE_PUBLISHABLE_KEY,
  process.env.SUPABASE_ANON_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
]);

export const SERVER_SUPABASE_SERVICE_ROLE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  ''
)
  .trim()
  .replace(/^['"]+|['"]+$/g, '')
  .trim();

export function hasSupabaseServiceRoleKey(): boolean {
  return isValidServiceRoleOrSecretKey(SERVER_SUPABASE_SERVICE_ROLE_KEY);
}

export function createServerSupabaseClient(accessToken?: string): SupabaseClient {
  return createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(accessToken
      ? {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      : {}),
  });
}

/**
 * Returns a server-only Supabase client that uses SUPABASE_SERVICE_ROLE_KEY when configured
 * (recommended on Vercel), or falls back to the caller's verified Supabase Auth JWT for RLS.
 */
export function createPrivilegedSupabaseClient(accessToken?: string): SupabaseClient {
  if (hasSupabaseServiceRoleKey()) {
    return createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return createServerSupabaseClient(accessToken);
}

const serverSupabase = createServerSupabaseClient();

export async function verifySupabaseAccessToken(token: string): Promise<SupabaseUser | null> {
  if (!token || token.startsWith('rpr_v1.')) return null;
  try {
    const { data, error } = await serverSupabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function syncUserLoginToSupabase(params: {
  userUid: string;
  email: string;
  password?: string;
  fullName?: string | null;
  phone?: string | null;
  role: string;
  authProvider: 'email' | 'google';
}): Promise<{ supabaseUserId: string | null; supabaseAccessToken: string | null }> {
  let supabaseUserId: string | null = null;
  let supabaseAccessToken: string | null = null;
  const cleanEmail = params.email.trim().toLowerCase();

  // 1. Register or sign in the user with Supabase Auth when password is available
  if (params.password) {
    try {
      const signInRes = await serverSupabase.auth.signInWithPassword({
        email: cleanEmail,
        password: params.password,
      });

      if (signInRes.data?.user) {
        supabaseUserId = signInRes.data.user.id;
        supabaseAccessToken = signInRes.data.session?.access_token ?? null;
      } else if (
        signInRes.error &&
        /invalid login credentials/i.test(signInRes.error.message || '')
      ) {
        const signUpRes = await serverSupabase.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName || '',
              phone: params.phone || '',
            },
          },
        });
        if (signUpRes.data?.user) {
          supabaseUserId = signUpRes.data.user.id;
          supabaseAccessToken = signUpRes.data.session?.access_token ?? null;
        }
      }
    } catch (err) {
      console.warn('Non-fatal Supabase Auth sync warning:', err);
    }
  }

  // 2. Record login event in Supabase public.user_logins table (when table exists)
  try {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken || undefined);
    await client.from('user_logins').insert({
      user_uid: supabaseUserId || params.userUid,
      email: cleanEmail,
      full_name: params.fullName?.trim() || null,
      phone: params.phone?.trim() || null,
      role: params.role === 'admin' ? 'admin' : 'customer',
      auth_provider: params.authProvider,
      logged_in_at: new Date().toISOString(),
    });
  } catch {
    // Table may not be initialized yet in Supabase SQL Editor; safely ignore
  }

  return { supabaseUserId, supabaseAccessToken };
}

export interface SupabaseOrderSyncPayload {
  localEnquiryId: number;
  userUid: string | null;
  supabaseUserId?: string | null;
  productId: number | null;
  productName: string;
  productPriceInr: number | null;
  productSku: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  preferredSize: string | null;
  notes: string | null;
  status?: string;
  createdAt?: string;
}

export async function syncOrderToSupabase(
  payload: SupabaseOrderSyncPayload,
  accessToken?: string
): Promise<{ synced: boolean; orderId?: number; error?: string }> {
  const client = createPrivilegedSupabaseClient(accessToken);
  const isUuid =
    payload.supabaseUserId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      payload.supabaseUserId
    );

  const createdIso = payload.createdAt || new Date().toISOString();

  try {
    const [ordersRes, enquiriesRes] = await Promise.all([
      client
        .from('orders')
        .upsert(
          {
            local_enquiry_id: payload.localEnquiryId,
            user_uid: payload.userUid,
            auth_user_id: isUuid ? payload.supabaseUserId : null,
            product_id: payload.productId,
            product_title: payload.productName,
            product_price_inr: payload.productPriceInr,
            product_sku: payload.productSku,
            customer_name: payload.customerName,
            customer_phone: payload.customerPhone,
            customer_email: payload.customerEmail.toLowerCase().trim(),
            preferred_size: payload.preferredSize,
            notes: payload.notes,
            status: payload.status || 'new',
            created_at: createdIso,
          },
          { onConflict: 'local_enquiry_id', ignoreDuplicates: false }
        )
        .select('id')
        .maybeSingle(),
      client.from('enquiries').upsert(
        {
          local_enquiry_id: payload.localEnquiryId,
          user_uid: payload.userUid,
          auth_user_id: isUuid ? payload.supabaseUserId : null,
          product_id: payload.productId,
          product_name: payload.productName,
          product_price_inr: payload.productPriceInr,
          product_sku: payload.productSku,
          customer_name: payload.customerName,
          customer_phone: payload.customerPhone,
          customer_email: payload.customerEmail.toLowerCase().trim(),
          preferred_size: payload.preferredSize,
          notes: payload.notes,
          status: payload.status || 'new',
          created_at: createdIso,
        },
        { onConflict: 'local_enquiry_id', ignoreDuplicates: false }
      ),
    ]);

    if (ordersRes.error && enquiriesRes.error) {
      // Fallback plain insert when anon RLS allows INSERT (with minimal return) without SELECT/UPDATE
      const [plainOrder, plainEnq] = await Promise.all([
        client.from('orders').insert({
          local_enquiry_id: payload.localEnquiryId,
          user_uid: payload.userUid,
          auth_user_id: isUuid ? payload.supabaseUserId : null,
          product_id: payload.productId,
          product_title: payload.productName,
          product_price_inr: payload.productPriceInr,
          product_sku: payload.productSku,
          customer_name: payload.customerName,
          customer_phone: payload.customerPhone,
          customer_email: payload.customerEmail.toLowerCase().trim(),
          preferred_size: payload.preferredSize,
          notes: payload.notes,
          status: payload.status || 'new',
          created_at: createdIso,
        }),
        client.from('enquiries').insert({
          local_enquiry_id: payload.localEnquiryId,
          user_uid: payload.userUid,
          auth_user_id: isUuid ? payload.supabaseUserId : null,
          product_id: payload.productId,
          product_name: payload.productName,
          product_price_inr: payload.productPriceInr,
          product_sku: payload.productSku,
          customer_name: payload.customerName,
          customer_phone: payload.customerPhone,
          customer_email: payload.customerEmail.toLowerCase().trim(),
          preferred_size: payload.preferredSize,
          notes: payload.notes,
          status: payload.status || 'new',
          created_at: createdIso,
        }),
      ]);

      if (plainOrder.error && plainEnq.error) {
        return {
          synced: false,
          error: plainOrder.error.message || plainEnq.error.message,
        };
      }

      return {
        synced: true,
        orderId: payload.localEnquiryId,
      };
    }

    return {
      synced: true,
      orderId: typeof ordersRes.data?.id === 'number' ? ordersRes.data.id : payload.localEnquiryId,
    };
  } catch (err) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : 'Unable to write order to Supabase.',
    };
  }
}

export async function uploadImageToSupabaseStorage(params: {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  accessToken?: string;
}): Promise<{ uploaded: boolean; publicUrl?: string; objectPath?: string }> {
  try {
    const client = createPrivilegedSupabaseClient(params.accessToken);
    const ext =
      params.mimeType === 'image/png'
        ? 'png'
        : params.mimeType === 'image/webp'
          ? 'webp'
          : 'jpg';
    const baseName = params.filename
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);

    const objectPath = `catalogue/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${
      baseName || 'piece'
    }.${ext}`;

    const uploadRes = await client.storage
      .from('product-images')
      .upload(objectPath, params.buffer, {
        contentType: params.mimeType,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadRes.error) {
      return { uploaded: false };
    }

    const { data: pubData } = client.storage.from('product-images').getPublicUrl(objectPath);
    if (!pubData?.publicUrl) {
      return { uploaded: false };
    }

    return {
      uploaded: true,
      publicUrl: pubData.publicUrl,
      objectPath,
    };
  } catch {
    return { uploaded: false };
  }
}

export async function deleteImagesFromSupabaseStorage(
  urls: string[],
  accessToken?: string
): Promise<void> {
  const prefix = `${SERVER_SUPABASE_URL}/storage/v1/object/public/product-images/`;
  const paths = urls
    .map((u) => u.trim())
    .filter((u) => u.startsWith(prefix))
    .map((u) => decodeURIComponent(u.slice(prefix.length)))
    .filter(Boolean);

  if (paths.length === 0) return;

  try {
    const client = createPrivilegedSupabaseClient(accessToken);
    await client.storage.from('product-images').remove(paths);
  } catch {
    // Best-effort storage cleanup
  }
}

export async function syncCategoryToSupabase(
  category: { name: string; slug: string },
  accessToken?: string
): Promise<number | null> {
  try {
    const client = createPrivilegedSupabaseClient(accessToken);
    const res = await client
      .from('categories')
      .upsert(
        {
          name: category.name,
          slug: category.slug,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug', ignoreDuplicates: false }
      )
      .select('id')
      .maybeSingle();

    if (res.data?.id) return Number(res.data.id);

    const existing = await client
      .from('categories')
      .select('id')
      .eq('slug', category.slug)
      .maybeSingle();
    return existing.data?.id ? Number(existing.data.id) : null;
  } catch {
    return null;
  }
}

export async function syncProductToSupabase(
  product: {
    categoryName: string;
    categorySlug: string;
    title: string;
    slug: string;
    description: string;
    priceInr: number;
    sku: string | null;
    imageUrls: string[];
    finish: string | null;
    sizes: string[];
    isFeatured: boolean;
    availabilityStatus: string;
    isPublished: boolean;
  },
  accessToken?: string
): Promise<boolean> {
  try {
    const sbCategoryId = await syncCategoryToSupabase(
      { name: product.categoryName, slug: product.categorySlug },
      accessToken
    );
    if (!sbCategoryId) return false;

    const client = createPrivilegedSupabaseClient(accessToken);
    const res = await client.from('products').upsert(
      {
        category_id: sbCategoryId,
        title: product.title,
        slug: product.slug,
        description: product.description,
        price_inr: product.priceInr,
        sku: product.sku,
        image_urls: product.imageUrls,
        finish: product.finish,
        sizes: product.sizes,
        is_featured: product.isFeatured,
        availability_status: product.availabilityStatus,
        is_published: product.isPublished,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug', ignoreDuplicates: false }
    );
    return !res.error;
  } catch {
    return false;
  }
}

export async function deleteProductFromSupabaseBySlug(
  slug: string,
  accessToken?: string
): Promise<void> {
  if (!slug) return;
  try {
    const client = createPrivilegedSupabaseClient(accessToken);
    await client.from('products').delete().eq('slug', slug);
  } catch {
    // Non-fatal mirror cleanup
  }
}

export interface SupabaseDiagnostics {
  projectId: string;
  projectUrl: string;
  sqlEditorUrl: string;
  authReachable: boolean;
  tablesReady: boolean;
  storageBucketReady: boolean;
  serviceRoleConfigured: boolean;
  tables: {
    profiles: boolean;
    user_logins: boolean;
    orders: boolean;
    enquiries: boolean;
    categories: boolean;
    products: boolean;
  };
  migrationSql: string;
}

function readMigrationSql(): string {
  try {
    const sqlPath = path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '001_rooprani_catalogue_and_rls.sql'
    );
    if (fs.existsSync(sqlPath)) {
      const content = fs.readFileSync(sqlPath, 'utf8');
      if (content.trim().length > 0) return content;
    }
  } catch {
    // Fall back to embedded TypeScript constant in serverless environments
  }
  return SUPABASE_MIGRATION_SQL;
}

async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const apiKey = hasSupabaseServiceRoleKey()
      ? SERVER_SUPABASE_SERVICE_ROLE_KEY
      : SERVER_SUPABASE_KEY;
    const res = await fetch(
      `${SERVER_SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`,
      {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    if (res.status === 200 || res.status === 206) {
      return true;
    }
    const body = await res.text();
    if (body.includes('PGRST205') || res.status === 404) {
      return false;
    }
    return res.status === 401 || res.status === 403;
  } catch {
    return false;
  }
}

async function checkStorageBucketReady(): Promise<boolean> {
  try {
    const client = createPrivilegedSupabaseClient();
    const listRes = await client.storage.from('product-images').list('catalogue', { limit: 1 });
    return !listRes.error;
  } catch {
    return false;
  }
}

export async function getSupabaseDiagnostics(): Promise<SupabaseDiagnostics> {
  let authReachable = false;
  try {
    const authRes = await fetch(`${SERVER_SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SERVER_SUPABASE_KEY,
        Authorization: `Bearer ${SERVER_SUPABASE_KEY}`,
      },
    });
    authReachable = authRes.ok;
  } catch {
    authReachable = false;
  }

  const [
    profiles,
    user_logins,
    orders,
    enquiries,
    categories,
    products,
    storageBucketReady,
  ] = await Promise.all([
    checkTableExists('profiles'),
    checkTableExists('user_logins'),
    checkTableExists('orders'),
    checkTableExists('enquiries'),
    checkTableExists('categories'),
    checkTableExists('products'),
    checkStorageBucketReady(),
  ]);

  const tables = {
    profiles,
    user_logins,
    orders,
    enquiries,
    categories,
    products,
  };

  const tablesReady =
    orders && enquiries && user_logins && profiles && categories && products;

  return {
    projectId: SERVER_SUPABASE_PROJECT_ID,
    projectUrl: SERVER_SUPABASE_URL,
    sqlEditorUrl: `https://supabase.com/dashboard/project/${SERVER_SUPABASE_PROJECT_ID}/sql/new`,
    authReachable,
    tablesReady,
    storageBucketReady,
    serviceRoleConfigured: hasSupabaseServiceRoleKey(),
    tables,
    migrationSql: readMigrationSql(),
  };
}
