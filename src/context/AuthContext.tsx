import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { isSupabaseGoogleOAuthEnabled, supabase } from '../lib/supabase';
import type { CustomerEnquiry, CustomerProfile } from '../types/catalogue';

const AUTH_STORAGE_KEY = 'rooprani_auth_session_v1';

interface StoredAuthSession {
  token: string;
  supabaseAccessToken?: string | null;
}

export interface AuthenticatedSessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface EmailAuthResult {
  ok: boolean;
  isAdmin?: boolean;
  redirectTo?: string | null;
  error?: string;
  code?: string;
}

export interface EmailSignUpInput {
  fullName: string;
  phone?: string;
  email: string;
  password: string;
}

interface AuthContextValue {
  firebaseUser: AuthenticatedSessionUser | null;
  profile: CustomerProfile | null;
  enquiries: CustomerEnquiry[];
  isAdmin: boolean;
  loading: boolean;
  googleAuthAvailable: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithEmail: (email: string, password: string) => Promise<EmailAuthResult>;
  signUpWithEmail: (input: EmailSignUpInput) => Promise<EmailAuthResult>;
  signInWithGoogle: () => Promise<EmailAuthResult>;
  signOutUser: () => Promise<void>;
  saveProfile: (payload: { fullName: string; phone: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): StoredAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthSession;
    if (parsed && typeof parsed.token === 'string' && parsed.token.length > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredAuthSession | null) {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionUser, setSessionUser] = useState<AuthenticatedSessionUser | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleAuthAvailable, setGoogleAuthAvailable] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const serverTokenRef = useRef<string | null>(readStoredSession()?.token ?? null);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const applyServerUserPayload = useCallback(
    (user: CustomerProfile, userEnquiries: CustomerEnquiry[]) => {
      setProfile(user);
      setEnquiries(Array.isArray(userEnquiries) ? userEnquiries : []);
      setSessionUser({
        uid: user.uid,
        email: user.email,
        displayName: user.fullName,
      });
    },
    []
  );

  const fetchServerProfileWithBearer = useCallback(
    async (bearerToken: string, recordLogin = false): Promise<CustomerProfile> => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${bearerToken}`,
      };
      const storedSb = readStoredSession()?.supabaseAccessToken;
      if (storedSb) {
        headers['X-Supabase-Auth'] = storedSb;
      }
      if (recordLogin) {
        headers['x-record-login'] = '1';
      }

      const res = await fetch('/api/me', { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || 'Unable to synchronize your account.') as Error & {
          status?: number;
        };
        err.status = res.status;
        throw err;
      }

      const data = (await res.json()) as {
        user: CustomerProfile;
        enquiries: CustomerEnquiry[];
      };

      applyServerUserPayload(data.user, data.enquiries);
      return data.user;
    },
    [applyServerUserPayload]
  );

  useEffect(() => {
    let active = true;

    const {
      data: { subscription: supabaseSubscription },
    } = supabase.auth.onAuthStateChange((event, sbSession) => {
      if (!active) return;
      if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
        sbSession?.access_token &&
        !serverTokenRef.current
      ) {
        void fetchServerProfileWithBearer(
          sbSession.access_token,
          event === 'SIGNED_IN'
        ).catch((err) => {
          console.error('Supabase session synchronization failed:', err);
          if (active) {
            setAuthError(
              err instanceof Error ? err.message : 'Unable to synchronize your account.'
            );
          }
        });
      }
    });

    void (async () => {
      let resolvedSession = false;

      // 1. Check active server session token (rpr_v1.*) first
      const stored = readStoredSession();
      if (stored?.token) {
        serverTokenRef.current = stored.token;
        try {
          await fetchServerProfileWithBearer(stored.token, false);
          resolvedSession = true;
          if (active) setLoading(false);
        } catch (err) {
          const status = (err as { status?: number })?.status;
          if (status === 401 || status === 403) {
            serverTokenRef.current = null;
            writeStoredSession(null);
          } else {
            console.error('Failed to restore server session:', err);
          }
        }
      }

      // 2. Check active Supabase browser session (gszzzhfzysxtjncmbkjc)
      if (!resolvedSession && active) {
        try {
          const {
            data: { session: sbSession },
          } = await supabase.auth.getSession();
          if (sbSession?.access_token) {
            await fetchServerProfileWithBearer(sbSession.access_token, false);
            resolvedSession = true;
            if (active) setLoading(false);
          }
        } catch (err) {
          console.error('Failed to check Supabase session:', err);
        }
      }

      // 3. Check whether Google OAuth is enabled in Supabase project gszzzhfzysxtjncmbkjc
      const sbGoogleEnabled = await isSupabaseGoogleOAuthEnabled();
      if (!active) return;
      setGoogleAuthAvailable(sbGoogleEnabled);

      if (!resolvedSession) {
        setSessionUser(null);
        setProfile(null);
        setEnquiries([]);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
      supabaseSubscription.unsubscribe();
    };
  }, [fetchServerProfileWithBearer]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<EmailAuthResult> => {
      setAuthError(null);
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        const msg = 'Please enter both your email address and password.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg =
            data.error || 'Incorrect email or password. Please verify your credentials.';
          setAuthError(msg);
          return { ok: false, error: msg };
        }

        const token = String(data.token);
        serverTokenRef.current = token;
        writeStoredSession({
          token,
          supabaseAccessToken: data.supabaseAccessToken ?? null,
        });

        // Sync browser Supabase client session when Supabase issued an active session
        if (data.supabaseAccessToken) {
          void supabase.auth
            .signInWithPassword({ email: cleanEmail, password })
            .catch(() => undefined);
        }

        const user = data.user as CustomerProfile;
        applyServerUserPayload(
          user,
          Array.isArray(data.enquiries) ? (data.enquiries as CustomerEnquiry[]) : []
        );

        return {
          ok: true,
          isAdmin: user.role === 'admin',
          redirectTo: data.redirectTo ?? (user.role === 'admin' ? '/admin' : null),
        };
      } catch (err) {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : 'Unable to connect to authentication service.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }
    },
    [applyServerUserPayload]
  );

  const signUpWithEmail = useCallback(
    async (input: EmailSignUpInput): Promise<EmailAuthResult> => {
      setAuthError(null);
      const cleanEmail = input.email.trim().toLowerCase();
      const cleanName = input.fullName.trim();
      const cleanPhone = (input.phone ?? '').trim();

      if (cleanName.length < 2) {
        const msg = 'Please enter your full name.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        const msg = 'Please enter a valid email address.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }
      if (!input.password || input.password.length < 6) {
        const msg = 'Password must be at least 6 characters long.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            password: input.password,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data.error || 'Unable to create your account.';
          setAuthError(msg);
          return { ok: false, error: msg };
        }

        const token = String(data.token);
        serverTokenRef.current = token;
        writeStoredSession({
          token,
          supabaseAccessToken: data.supabaseAccessToken ?? null,
        });

        // Sync browser Supabase client session when Supabase issued an active session
        if (data.supabaseAccessToken) {
          void supabase.auth
            .signInWithPassword({ email: cleanEmail, password: input.password })
            .catch(() => undefined);
        }

        const user = data.user as CustomerProfile;
        applyServerUserPayload(
          user,
          Array.isArray(data.enquiries) ? (data.enquiries as CustomerEnquiry[]) : []
        );

        return {
          ok: true,
          isAdmin: user.role === 'admin',
          redirectTo: data.redirectTo ?? (user.role === 'admin' ? '/admin' : null),
        };
      } catch (err) {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : 'Unable to create account right now.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }
    },
    [applyServerUserPayload]
  );

  const getIdToken = useCallback(async (forceRefresh = false): Promise<string | null> => {
    if (serverTokenRef.current) {
      return serverTokenRef.current;
    }
    const stored = readStoredSession();
    if (stored?.token) {
      serverTokenRef.current = stored.token;
      return stored.token;
    }
    try {
      if (forceRefresh) {
        const { data } = await supabase.auth.refreshSession();
        if (data?.session?.access_token) {
          return data.session.access_token;
        }
      }
      const {
        data: { session: sbSession },
      } = await supabase.auth.getSession();
      if (sbSession?.access_token) {
        return sbSession.access_token;
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<EmailAuthResult> => {
    setAuthError(null);

    const sbGoogleEnabled = await isSupabaseGoogleOAuthEnabled();
    if (!sbGoogleEnabled) {
      setGoogleAuthAvailable(false);
      const msg =
        'Google Sign-In is not enabled in Supabase Auth yet. Please sign in or create an account with your Email and Password.';
      setAuthError(msg);
      return { ok: false, error: msg };
    }

    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: redirectTo ? { redirectTo } : undefined,
    });
    if (error) {
      setAuthError(error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    serverTokenRef.current = null;
    writeStoredSession(null);
    await supabase.auth.signOut().catch(() => undefined);
    setSessionUser(null);
    setProfile(null);
    setEnquiries([]);
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = await getIdToken(false);
    if (!token) return;
    await fetchServerProfileWithBearer(token, false);
  }, [getIdToken, fetchServerProfileWithBearer]);

  const saveProfile = useCallback(
    async (payload: { fullName: string; phone: string }) => {
      const token = await getIdToken(false);
      if (!token) {
        throw new Error('Please sign in first.');
      }

      const stored = readStoredSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      };
      if (stored?.supabaseAccessToken) {
        headers['X-Supabase-Auth'] = stored.supabaseAccessToken;
      }

      const res = await fetch('/api/me', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Unable to save profile details.');
      }

      if (typeof data.token === 'string' && data.token.startsWith('rpr_v1.') && stored) {
        serverTokenRef.current = data.token;
        writeStoredSession({
          token: data.token,
          supabaseAccessToken: stored.supabaseAccessToken ?? null,
        });
      }

      if (data.user) {
        const updatedUser = data.user as CustomerProfile;
        setProfile(updatedUser);
        setSessionUser({
          uid: updatedUser.uid,
          email: updatedUser.email,
          displayName: updatedUser.fullName,
        });
      }
    },
    [getIdToken]
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser: sessionUser,
        profile,
        enquiries,
        isAdmin: profile?.role === 'admin',
        loading,
        googleAuthAvailable,
        authError,
        clearAuthError,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOutUser,
        saveProfile,
        refreshProfile,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
