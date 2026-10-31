import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://gszzzhfzysxtjncmbkjc.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_VWVwWVIi7WrHY6TOs_DSaA_vKpUMinh';

export function normalizeSupabaseUrl(
  candidates: Array<string | undefined>,
  fallbackUrl = DEFAULT_SUPABASE_URL
): string {
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
  return fallbackUrl;
}

function normalizeSupabaseKey(
  candidates: Array<string | undefined>,
  fallbackKey = DEFAULT_SUPABASE_PUBLISHABLE_KEY
): string {
  for (const raw of candidates) {
    if (!raw) continue;
    const cleaned = raw.trim().replace(/^['"]+|['"]+$/g, '').trim();
    const isValidFormat =
      /^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(cleaned) ||
      /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(cleaned);
    if (
      cleaned.length >= 20 &&
      !/^my_|^your_|placeholder|example|<|>/i.test(cleaned) &&
      isValidFormat
    ) {
      return cleaned;
    }
  }
  return fallbackKey;
}

export const SUPABASE_URL = normalizeSupabaseUrl([import.meta.env.VITE_SUPABASE_URL]);

export const SUPABASE_PUBLISHABLE_KEY = normalizeSupabaseKey([
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
]);

export const SUPABASE_PROJECT_ID =
  SUPABASE_URL.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co$/i)?.[1] ||
  'gszzzhfzysxtjncmbkjc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

let supabaseGoogleCheckPromise: Promise<boolean> | null = null;

/**
 * Checks whether Google OAuth is enabled in the connected Supabase project
 * (`gszzzhfzysxtjncmbkjc`), allowing domain-independent Google sign-in on Vercel
 * whenever the owner enables the Google provider in Supabase Auth.
 */
export function isSupabaseGoogleOAuthEnabled(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return Promise.resolve(false);
  }
  if (supabaseGoogleCheckPromise) {
    return supabaseGoogleCheckPromise;
  }

  supabaseGoogleCheckPromise = (async () => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        signal: controller.signal,
      });
      if (!res.ok) return false;
      const data = (await res.json()) as {
        external?: { google?: boolean };
      };
      return Boolean(data?.external?.google);
    } catch {
      return false;
    } finally {
      window.clearTimeout(timer);
    }
  })();

  return supabaseGoogleCheckPromise;
}
