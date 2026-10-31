import { supabase } from '../lib/supabase';
import type {
  AdminDashboardData,
  Category,
  CustomerEnquiry,
  Product,
} from '../types/catalogue';

export type GetTokenFn = (forceRefresh?: boolean) => Promise<string | null>;

export interface ProductSaveInput {
  categoryId: number;
  title: string;
  description: string;
  imageUrls: string[];
  priceInr: number;
  sku?: string | null;
  availabilityStatus: 'available' | 'unavailable';
  isPublished: boolean;
  isFeatured?: boolean;
  finish?: string | null;
  sizes?: string[];
}

export class AdminAuthExpiredError extends Error {
  constructor(message = 'Your administrator session expired. Please sign in again.') {
    super(message);
    this.name = 'AdminAuthExpiredError';
  }
}

async function resolveStoredSupabaseToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      return data.session.access_token;
    }
  } catch {
    // Fallback to stored session cache
  }

  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('rooprani_auth_session_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { supabaseAccessToken?: string | null };
    return typeof parsed.supabaseAccessToken === 'string' && parsed.supabaseAccessToken
      ? parsed.supabaseAccessToken
      : null;
  } catch {
    return null;
  }
}

async function authorizedAdminFetch<T>(
  getToken: GetTokenFn,
  input: string,
  init: RequestInit = {}
): Promise<T> {
  let token = await getToken(false);
  if (!token) {
    throw new AdminAuthExpiredError();
  }

  const sbAccessToken = await resolveStoredSupabaseToken();

  const execute = async (bearerToken: string) => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${bearerToken}`);
    if (sbAccessToken) {
      headers.set('X-Supabase-Auth', sbAccessToken);
    }
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    try {
      return await fetch(input, {
        ...init,
        headers,
      });
    } catch {
      throw new Error(
        'Network connection failed. Please check your internet connection and try again.'
      );
    }
  };

  let response = await execute(token);

  if (response.status === 401) {
    token = await getToken(true);
    if (!token) {
      throw new AdminAuthExpiredError();
    }
    response = await execute(token);
  }

  const payload = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new AdminAuthExpiredError(payload.error || undefined);
  }

  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }

  return payload as T;
}

export async function fetchAdminDashboard(getToken: GetTokenFn): Promise<AdminDashboardData> {
  return authorizedAdminFetch<AdminDashboardData>(getToken, '/api/admin/dashboard');
}

export async function fetchAdminProductById(
  getToken: GetTokenFn,
  id: number
): Promise<Product> {
  const data = await authorizedAdminFetch<{ product: Product }>(
    getToken,
    `/api/admin/products/${id}`
  );
  return data.product;
}

export async function uploadAdminMediaAsset(
  getToken: GetTokenFn,
  fileData: { filename: string; mimeType: string; dataBase64: string }
): Promise<{ id: number; storage?: string; url: string }> {
  return authorizedAdminFetch<{ id: number; storage?: string; url: string }>(
    getToken,
    '/api/admin/media',
    {
      method: 'POST',
      body: JSON.stringify(fileData),
    }
  );
}

export async function deleteAdminMediaAsset(
  getToken: GetTokenFn,
  mediaId: number
): Promise<void> {
  if (mediaId <= 0) return;
  try {
    await authorizedAdminFetch<{ ok: boolean }>(getToken, `/api/admin/media/${mediaId}`, {
      method: 'DELETE',
    });
  } catch {
    // Non-fatal cleanup best-effort
  }
}

export async function createAdminProduct(
  getToken: GetTokenFn,
  payload: ProductSaveInput
): Promise<Product> {
  const data = await authorizedAdminFetch<{ product: Product }>(
    getToken,
    '/api/admin/products',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
  return data.product;
}

export async function updateAdminProduct(
  getToken: GetTokenFn,
  id: number,
  payload: ProductSaveInput
): Promise<Product> {
  const data = await authorizedAdminFetch<{ product: Product }>(
    getToken,
    `/api/admin/products/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return data.product;
}

export async function deleteAdminProduct(
  getToken: GetTokenFn,
  id: number
): Promise<void> {
  await authorizedAdminFetch<{ ok: boolean }>(getToken, `/api/admin/products/${id}`, {
    method: 'DELETE',
  });
}

export async function createAdminCategory(
  getToken: GetTokenFn,
  name: string
): Promise<Category> {
  const data = await authorizedAdminFetch<{ category: Category }>(
    getToken,
    '/api/admin/categories',
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    }
  );
  return data.category;
}

export async function renameAdminCategory(
  getToken: GetTokenFn,
  id: number,
  name: string
): Promise<Category> {
  const data = await authorizedAdminFetch<{ category: Category }>(
    getToken,
    `/api/admin/categories/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }
  );
  return data.category;
}

export async function reassignAdminCategoryProducts(
  getToken: GetTokenFn,
  fromCategoryId: number,
  targetCategoryId: number
): Promise<void> {
  await authorizedAdminFetch<{ ok: boolean }>(
    getToken,
    `/api/admin/categories/${fromCategoryId}/reassign`,
    {
      method: 'POST',
      body: JSON.stringify({ targetCategoryId }),
    }
  );
}

export async function deleteAdminCategory(
  getToken: GetTokenFn,
  id: number
): Promise<void> {
  await authorizedAdminFetch<{ ok: boolean }>(getToken, `/api/admin/categories/${id}`, {
    method: 'DELETE',
  });
}

export async function updateAdminEnquiryStatus(
  getToken: GetTokenFn,
  enquiryId: number,
  status: string
): Promise<CustomerEnquiry | null> {
  const data = await authorizedAdminFetch<{ enquiry: CustomerEnquiry | null }>(
    getToken,
    `/api/admin/enquiries/${enquiryId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
  return data.enquiry;
}

export interface SupabaseDiagnosticsPayload {
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

export interface BackendArchitecturePayload {
  runtime: 'vercel-serverless' | 'node-server';
  primaryDatabase: 'postgresql' | 'supabase-cloud';
  postgresSource: string;
  postgresConnected: boolean;
  mediaStorage: 'supabase-storage-cdn' | 'postgresql-binary' | 'inline-data-url';
  serviceRoleConfigured: boolean;
  sessionSecretConfigured: boolean;
  vercelReady: boolean;
}

export interface SupabaseStatusResponse {
  diagnostics: SupabaseDiagnosticsPayload;
  pendingOrderSyncCount: number;
  architecture?: BackendArchitecturePayload;
}

export async function fetchAdminSupabaseStatus(
  getToken: GetTokenFn
): Promise<SupabaseStatusResponse> {
  return authorizedAdminFetch<SupabaseStatusResponse>(
    getToken,
    '/api/admin/supabase-status'
  );
}

export async function triggerAdminSupabaseSync(getToken: GetTokenFn): Promise<{
  ok: boolean;
  syncedCategoriesCount: number;
  syncedProductsCount: number;
  syncedOrdersCount: number;
  syncedUsersCount: number;
  pendingOrderSyncCount: number;
  diagnostics: SupabaseDiagnosticsPayload;
  architecture?: BackendArchitecturePayload;
}> {
  return authorizedAdminFetch(getToken, '/api/admin/supabase-sync', {
    method: 'POST',
  });
}
