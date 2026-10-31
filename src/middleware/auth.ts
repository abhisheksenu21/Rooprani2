import type { NextFunction, Request, Response } from 'express';
import {
  ensureInitialAdminSeeded,
  getUserByEmail,
  getUserByUid,
  isAuthorizedBootstrapAdmin,
  upsertUserFromAuth,
} from '../db/repository.ts';
import { verifySignedSessionToken } from '../lib/security.ts';
import { verifySupabaseAccessToken } from '../lib/supabase-server.ts';

export interface AuthRequest extends Request {
  supabaseAccessToken?: string;
  dbUser?: {
    uid: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    role: string;
    supabaseUserId?: string | null;
  };
}

function readOptionalSupabaseHeader(req: Request): string | undefined {
  const raw = req.headers['x-supabase-auth'];
  if (typeof raw === 'string' && raw.trim().length > 20) {
    return raw.trim();
  }
  return undefined;
}

async function resolveAuthenticatedUserFromToken(
  token: string,
  headerSupabaseToken?: string
): Promise<{
  supabaseAccessToken?: string;
  dbUser: NonNullable<AuthRequest['dbUser']>;
} | null> {
  if (!token) return null;

  // 1. Server-signed HMAC session token (rpr_v1.*)
  if (token.startsWith('rpr_v1.')) {
    const payload = verifySignedSessionToken(token);
    if (!payload) return null;

    await ensureInitialAdminSeeded();
    const record =
      (await getUserByUid(payload.uid, headerSupabaseToken)) ||
      (await getUserByEmail(payload.email, headerSupabaseToken));

    if (record) {
      return {
        supabaseAccessToken: headerSupabaseToken,
        dbUser: {
          uid: record.uid,
          email: record.email,
          fullName: record.fullName ?? payload.fullName ?? null,
          phone: record.phone ?? payload.phone ?? null,
          role: isAuthorizedBootstrapAdmin(record.email) ? 'admin' : record.role,
          supabaseUserId: record.supabaseUserId ?? payload.supabaseUserId ?? null,
        },
      };
    }

    // Stateless session reconstruction from HMAC-verified token claims
    const cleanEmail = payload.email.toLowerCase().trim();
    const verifiedRole = isAuthorizedBootstrapAdmin(cleanEmail) ? 'admin' : 'customer';

    return {
      supabaseAccessToken: headerSupabaseToken,
      dbUser: {
        uid: payload.uid,
        email: cleanEmail,
        fullName: payload.fullName ?? null,
        phone: payload.phone ?? null,
        role: verifiedRole,
        supabaseUserId: payload.supabaseUserId ?? null,
      },
    };
  }

  // 2. Supabase Auth JWT (from gszzzhfzysxtjncmbkjc.supabase.co)
  const sbUser = await verifySupabaseAccessToken(token);
  if (sbUser && sbUser.email) {
    const meta = (sbUser.user_metadata ?? {}) as Record<string, unknown>;
    const synced = await upsertUserFromAuth({
      uid: sbUser.id,
      email: sbUser.email,
      displayName: typeof meta.full_name === 'string' ? meta.full_name : null,
      phone: typeof meta.phone === 'string' ? meta.phone : null,
      supabaseUserId: sbUser.id,
      emailVerified: Boolean(sbUser.email_confirmed_at),
      supabaseAccessToken: token,
    });

    return {
      supabaseAccessToken: token,
      dbUser: {
        uid: synced.uid,
        email: synced.email,
        fullName: synced.fullName,
        phone: synced.phone,
        role: synced.role,
        supabaseUserId: synced.supabaseUserId,
      },
    };
  }

  return null;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Please sign in to continue.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const headerSupabaseToken = readOptionalSupabaseHeader(req);

  try {
    const resolved = await resolveAuthenticatedUserFromToken(token, headerSupabaseToken);
    if (!resolved) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
      return;
    }

    if (resolved.supabaseAccessToken) {
      req.supabaseAccessToken = resolved.supabaseAccessToken;
    }
    req.dbUser = resolved.dbUser;
    next();
  } catch (error) {
    console.error('Error verifying authentication session:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid or expired session.' });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const headerSupabaseToken = readOptionalSupabaseHeader(req);
  if (headerSupabaseToken) {
    req.supabaseAccessToken = headerSupabaseToken;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const resolved = await resolveAuthenticatedUserFromToken(token, headerSupabaseToken);
    if (resolved) {
      if (resolved.supabaseAccessToken) {
        req.supabaseAccessToken = resolved.supabaseAccessToken;
      }
      req.dbUser = resolved.dbUser;
    }
  } catch {
    // Ignore invalid optional token so guest enquiries still succeed
  }
  next();
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  await requireAuth(req, res, () => {
    if (!req.dbUser || req.dbUser.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
      return;
    }
    next();
  });
};
