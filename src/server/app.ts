import express, { type NextFunction, type Request, type Response } from 'express';
import {
  checkPostgresHealth,
  ensurePostgresSchemaInitialized,
  ensurePostgresVerified,
  hasPostgresConfig,
} from '../db/index.ts';
import {
  authenticateUserWithPassword,
  createCategoryRecord,
  createEnquiryRecord,
  createMediaAssetRecord,
  createProductRecord,
  deleteCategoryRecord,
  deleteMediaAssetByIdIfUnused,
  deleteProductRecord,
  ensureInitialAdminSeeded,
  ensureInitialCategoriesSeeded,
  getAdminCatalogueData,
  getAdminProductById,
  getAllCatalogueForSupabaseSync,
  getAllUsersForSync,
  getCustomerEnquiries,
  getMediaAssetRecord,
  getPublicCatalogue,
  getUnsyncedEnquiries,
  linkSupabaseUserId,
  markEnquirySyncedToSupabase,
  reassignCategoryProductsRecord,
  registerCustomerWithPassword,
  updateCategoryRecord,
  updateCustomerProfile,
  updateEnquiryStatusRecord,
  updateProductRecord,
  upsertUserFromAuth,
} from '../db/repository.ts';
import {
  createSignedSessionToken,
  isSessionSecretConfigured,
} from '../lib/security.ts';
import {
  createPrivilegedSupabaseClient,
  createServerSupabaseClient,
  getSupabaseDiagnostics,
  syncCategoryToSupabase,
  syncOrderToSupabase,
  syncProductToSupabase,
  syncUserLoginToSupabase,
  uploadImageToSupabaseStorage,
} from '../lib/supabase-server.ts';
import {
  optionalAuth,
  requireAdmin,
  requireAuth,
  type AuthRequest,
} from '../middleware/auth.ts';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_AVAILABILITY = new Set([
  'available',
  'unavailable',
  'in_stock',
  'made_to_order',
  'limited',
  'out_of_stock',
]);
const ALLOWED_ENQUIRY_STATUS = new Set(['new', 'contacted', 'completed']);

// Serverless-safe sliding-window rate limiter for authentication routes
const AUTH_WINDOW_MS = 5 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 25;
const authAttemptsByIp = new Map<string, { count: number; resetAt: number }>();

function authRateLimiter(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  if (authAttemptsByIp.size > 1000) {
    for (const [k, v] of authAttemptsByIp.entries()) {
      if (v.resetAt <= now) authAttemptsByIp.delete(k);
    }
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
    req.socket?.remoteAddress ||
    'unknown';

  const current = authAttemptsByIp.get(ip);
  if (!current || current.resetAt <= now) {
    authAttemptsByIp.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    next();
    return;
  }

  if (current.count >= AUTH_MAX_ATTEMPTS) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSec));
    res.status(429).json({
      error: 'Too many authentication attempts. Please wait a minute and try again.',
    });
    return;
  }

  current.count += 1;
  next();
}

function sendSafeError(res: Response, error: unknown, fallbackMessage: string, status = 500) {
  const message =
    error instanceof Error && error.message ? error.message : fallbackMessage;
  res.status(status).json({ error: message });
}

function validateProductBody(body: Record<string, unknown>) {
  const rawTitle =
    typeof body.title === 'string' && body.title.trim()
      ? body.title.trim()
      : typeof body.name === 'string'
        ? body.name.trim()
        : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const rawPrice = body.priceInr ?? body.price_inr;
  const priceInr =
    typeof rawPrice === 'number' || typeof rawPrice === 'string' ? Number(rawPrice) : NaN;
  const rawCategoryId = body.categoryId ?? body.category_id;
  const categoryId = Number(rawCategoryId);

  const rawImages = Array.isArray(body.imageUrls)
    ? body.imageUrls
    : Array.isArray(body.image_urls)
      ? body.image_urls
      : [];
  const imageUrls = rawImages
    .filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0)
    .map((u: string) => u.trim());

  const sizes = Array.isArray(body.sizes)
    ? body.sizes
        .filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s: string) => s.trim())
    : [];

  const rawAvailability =
    typeof body.availabilityStatus === 'string'
      ? body.availabilityStatus
      : typeof body.availability_status === 'string'
        ? body.availability_status
        : 'available';

  if (!ALLOWED_AVAILABILITY.has(rawAvailability)) {
    return { error: 'Invalid availability status.' } as const;
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { error: 'Please select a valid category.' } as const;
  }

  if (rawTitle.length < 3 || rawTitle.length > 160) {
    return {
      error: 'Product title must be between 3 and 160 characters.',
    } as const;
  }

  if (description.length < 5) {
    return {
      error: 'Please enter a product description (at least 5 characters).',
    } as const;
  }

  if (imageUrls.length === 0) {
    return {
      error: 'Please upload at least one product photo.',
    } as const;
  }

  if (!Number.isFinite(priceInr) || priceInr < 0 || priceInr > 100_000_000) {
    return {
      error: 'Please enter a valid non-negative price in INR.',
    } as const;
  }

  const isPublished =
    body.isPublished !== undefined
      ? Boolean(body.isPublished)
      : body.is_published !== undefined
        ? Boolean(body.is_published)
        : body.isActive !== undefined
          ? Boolean(body.isActive)
          : true;

  return {
    value: {
      title: rawTitle,
      slug: typeof body.slug === 'string' ? body.slug : undefined,
      description,
      priceInr: Math.round(priceInr),
      sku: typeof body.sku === 'string' ? body.sku.trim() || null : null,
      categoryId,
      imageUrls,
      finish: typeof body.finish === 'string' ? body.finish.trim() || null : null,
      sizes,
      isPublished,
      isFeatured: Boolean(body.isFeatured ?? body.is_featured),
      availabilityStatus: rawAvailability,
    },
  } as const;
}

let coldStartBootstrapPromise: Promise<void> | null = null;

export async function ensureBackendInitialized(): Promise<void> {
  await ensurePostgresVerified();
  if (!hasPostgresConfig()) return;
  if (!coldStartBootstrapPromise) {
    coldStartBootstrapPromise = (async () => {
      await ensurePostgresSchemaInitialized();
      await Promise.all([ensureInitialAdminSeeded(), ensureInitialCategoriesSeeded()]);
    })().catch((err) => {
      coldStartBootstrapPromise = null;
      console.error('Backend bootstrap warning:', err);
    });
  }
  await coldStartBootstrapPromise;
}

export function createApiApp() {
  const app = express();
  app.disable('x-powered-by');

  // Keep JSON body limit compatible with both Cloud Run and Vercel Serverless Functions (4.5 MB cap)
  app.use(express.json({ limit: '4.5mb' }));

  // Baseline security & cache headers for API routes
  app.use('/api', async (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!req.path.startsWith('/media/')) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
    }
    await ensureBackendInitialized();
    next();
  });

  // ===========================================================================
  // SYSTEM HEALTH & READINESS ENDPOINT (Vercel + Cloud Run)
  // ===========================================================================
  app.get('/api/health', async (_req, res) => {
    const pgHealth = await checkPostgresHealth();
    res.json({
      ok: true,
      service: 'rooprani-api',
      runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
      databaseMode: pgHealth.configured ? 'postgresql+supabase' : 'supabase-cloud',
      timestamp: new Date().toISOString(),
    });
  });

  // ===========================================================================
  // AUTHENTICATION ROUTES (Email/Password + Supabase Auth + Login Persistence)
  // ===========================================================================

  app.post('/api/auth/login', authRateLimiter, async (req, res) => {
    const rawEmail =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!password) {
      res.status(400).json({ error: 'Please enter your password.' });
      return;
    }

    try {
      let user = await authenticateUserWithPassword(rawEmail, password);
      let supabaseUserId: string | null = user?.supabaseUserId ?? null;
      let supabaseAccessToken: string | null = null;

      // Also support users created directly in Supabase Dashboard Auth (and all customers on Vercel)
      if (!user) {
        const sbClient = createServerSupabaseClient();
        const sbRes = await sbClient.auth.signInWithPassword({
          email: rawEmail,
          password,
        });

        if (sbRes.data?.user && sbRes.data.user.email) {
          const meta = (sbRes.data.user.user_metadata ?? {}) as Record<string, unknown>;
          supabaseUserId = sbRes.data.user.id;
          supabaseAccessToken = sbRes.data.session?.access_token ?? null;

          user = await upsertUserFromAuth({
            uid: sbRes.data.user.id,
            email: sbRes.data.user.email,
            displayName: typeof meta.full_name === 'string' ? meta.full_name : null,
            phone: typeof meta.phone === 'string' ? meta.phone : null,
            supabaseUserId,
            emailVerified: Boolean(sbRes.data.user.email_confirmed_at),
            supabaseAccessToken: supabaseAccessToken ?? undefined,
          });
        } else if (sbRes.error && /email not confirmed/i.test(sbRes.error.message || '')) {
          res.status(401).json({
            error:
              'Please check your email inbox and confirm your email address before signing in.',
          });
          return;
        }
      }

      if (!user) {
        res.status(401).json({
          error:
            'Incorrect email or password. Please verify your credentials and try again.',
        });
        return;
      }

      // Sync account & record login event in Supabase backend (gszzzhfzysxtjncmbkjc)
      const sbSync = await syncUserLoginToSupabase({
        userUid: user.uid,
        email: user.email,
        password: supabaseAccessToken ? undefined : password,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        authProvider: 'email',
      });

      if (sbSync.supabaseUserId && sbSync.supabaseUserId !== user.supabaseUserId) {
        supabaseUserId = sbSync.supabaseUserId;
        await linkSupabaseUserId(user.uid, sbSync.supabaseUserId);
      }
      if (sbSync.supabaseAccessToken) {
        supabaseAccessToken = sbSync.supabaseAccessToken;
      }

      const token = createSignedSessionToken({
        uid: user.uid,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        phone: user.phone,
        supabaseUserId,
      });

      const enquiries = await getCustomerEnquiries(
        user.uid,
        supabaseAccessToken ?? undefined
      );

      res.json({
        token,
        supabaseAccessToken,
        user: {
          uid: user.uid,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role,
        },
        enquiries,
        redirectTo: user.role === 'admin' ? '/admin' : null,
      });
    } catch (error) {
      sendSafeError(res, error, 'Unable to sign in right now.');
    }
  });

  app.post('/api/auth/register', authRateLimiter, async (req, res) => {
    const rawEmail =
      typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const fullName =
      typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }

    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    if (phone) {
      const digits = phone.replace(/[^\d]/g, '');
      if (digits.length < 8 || digits.length > 15) {
        res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
        return;
      }
    }

    try {
      let supabaseUserId: string | null = null;
      let supabaseAccessToken: string | null = null;

      try {
        const sbClient = createServerSupabaseClient();
        const sbSignup = await sbClient.auth.signUp({
          email: rawEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone || '',
            },
          },
        });
        if (sbSignup.error && /already registered/i.test(sbSignup.error.message || '')) {
          res.status(409).json({
            error: 'An account with this email already exists. Please sign in instead.',
          });
          return;
        }
        if (sbSignup.data?.user) {
          supabaseUserId = sbSignup.data.user.id;
          supabaseAccessToken = sbSignup.data.session?.access_token ?? null;
        }
      } catch (sbErr) {
        console.warn('Non-fatal Supabase signup warning:', sbErr);
      }

      const createdUser = await registerCustomerWithPassword({
        email: rawEmail,
        passwordPlain: password,
        fullName,
        phone: phone || null,
        supabaseUserId,
      });

      await syncUserLoginToSupabase({
        userUid: createdUser.uid,
        email: createdUser.email,
        fullName: createdUser.fullName,
        phone: createdUser.phone,
        role: createdUser.role,
        authProvider: 'email',
      });

      const token = createSignedSessionToken({
        uid: createdUser.uid,
        email: createdUser.email,
        role: createdUser.role,
        fullName: createdUser.fullName,
        phone: createdUser.phone,
        supabaseUserId: createdUser.supabaseUserId,
      });

      res.status(201).json({
        token,
        supabaseAccessToken,
        user: {
          uid: createdUser.uid,
          email: createdUser.email,
          fullName: createdUser.fullName,
          phone: createdUser.phone,
          role: createdUser.role,
        },
        enquiries: [],
        redirectTo: createdUser.role === 'admin' ? '/admin' : null,
      });
    } catch (error) {
      const isConflict =
        error instanceof Error && error.message.includes('already exists');
      sendSafeError(
        res,
        error,
        'Unable to create your account right now.',
        isConflict ? 409 : 500
      );
    }
  });

  // Public Catalogue API (only published + available products)
  app.get('/api/catalogue', async (_req, res) => {
    try {
      const catalogue = await getPublicCatalogue();
      res.json(catalogue);
    } catch (error) {
      sendSafeError(res, error, 'Unable to load jewellery catalogue.');
    }
  });

  // Persistent Binary Media Serving from PostgreSQL Storage
  app.get('/api/media/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid media identifier.' });
      return;
    }

    try {
      const asset = await getMediaAssetRecord(id);
      if (!asset) {
        res.status(404).json({ error: 'Image not found.' });
        return;
      }

      const buffer = Buffer.from(asset.dataBase64, 'base64');
      res.setHeader('Content-Type', asset.mimeType);
      res.setHeader('Content-Length', String(buffer.length));
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(buffer);
    } catch (error) {
      sendSafeError(res, error, 'Unable to load image.');
    }
  });

  // Customer Order / Enquiry Submission (Saves to PostgreSQL + Supabase orders & enquiries tables)
  const handleCustomerOrderOrEnquiry = async (req: AuthRequest, res: Response) => {
    const {
      productId,
      productName,
      productPriceInr,
      productSku,
      customerName,
      customerPhone,
      customerEmail,
      preferredSize,
      notes,
    } = req.body ?? {};

    const cleanName = typeof customerName === 'string' ? customerName.trim() : '';
    const cleanPhone = typeof customerPhone === 'string' ? customerPhone.trim() : '';
    const cleanEmail = typeof customerEmail === 'string' ? customerEmail.trim() : '';
    const cleanProductName =
      typeof productName === 'string' && productName.trim()
        ? productName.trim()
        : 'Direct Boutique Enquiry';

    if (cleanName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }

    const phoneDigits = cleanPhone.replace(/[^\d]/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
      return;
    }

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const parsedProductId =
      productId !== undefined && productId !== null && Number.isInteger(Number(productId))
        ? Number(productId)
        : null;
    const parsedPrice =
      productPriceInr !== undefined &&
      productPriceInr !== null &&
      Number.isFinite(Number(productPriceInr))
        ? Math.max(0, Math.round(Number(productPriceInr)))
        : null;

    try {
      if (parsedProductId !== null) {
        const targetProduct = await getAdminProductById(
          parsedProductId,
          req.supabaseAccessToken
        );
        if (
          targetProduct &&
          (!targetProduct.is_published ||
            !targetProduct.is_active ||
            targetProduct.availability_status === 'unavailable' ||
            targetProduct.availability_status === 'out_of_stock')
        ) {
          res.status(400).json({
            error: 'This jewellery piece is currently unavailable for enquiry.',
          });
          return;
        }
      }

      const enquiry = await createEnquiryRecord(
        {
          userUid: req.dbUser?.uid ?? null,
          supabaseUserId: req.dbUser?.supabaseUserId ?? null,
          productId: parsedProductId,
          productName: cleanProductName,
          productPriceInr: parsedPrice,
          productSku: typeof productSku === 'string' ? productSku : null,
          customerName: cleanName,
          customerPhone: cleanPhone,
          customerEmail: cleanEmail,
          preferredSize: typeof preferredSize === 'string' ? preferredSize : null,
          notes: typeof notes === 'string' ? notes : null,
        },
        req.supabaseAccessToken
      );

      let supabaseSynced = Boolean(
        'supabaseSynced' in enquiry ? enquiry.supabaseSynced : false
      );

      if (hasPostgresConfig()) {
        const sbResult = await syncOrderToSupabase(
          {
            localEnquiryId: enquiry.id,
            userUid: req.dbUser?.uid ?? null,
            supabaseUserId: req.dbUser?.supabaseUserId ?? null,
            productId: parsedProductId,
            productName: cleanProductName,
            productPriceInr: parsedPrice,
            productSku: typeof productSku === 'string' ? productSku : null,
            customerName: cleanName,
            customerPhone: cleanPhone,
            customerEmail: cleanEmail,
            preferredSize: typeof preferredSize === 'string' ? preferredSize : null,
            notes: typeof notes === 'string' ? notes : null,
            status: enquiry.status,
            createdAt: enquiry.createdAt.toISOString(),
          },
          req.supabaseAccessToken
        );

        if (sbResult.synced) {
          supabaseSynced = true;
          await markEnquirySyncedToSupabase(enquiry.id);
        }
      }

      res.status(201).json({
        enquiry,
        supabaseSynced,
      });
    } catch (error) {
      sendSafeError(res, error, 'Unable to submit your enquiry right now.');
    }
  };

  app.post('/api/enquiries', optionalAuth, handleCustomerOrderOrEnquiry);
  app.post('/api/orders', optionalAuth, handleCustomerOrderOrEnquiry);

  // Authenticated User Profile & Role Verification (users cannot modify role)
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (req.headers['x-record-login'] === '1' && req.dbUser) {
        void syncUserLoginToSupabase({
          userUid: req.dbUser.uid,
          email: req.dbUser.email,
          fullName: req.dbUser.fullName,
          phone: req.dbUser.phone,
          role: req.dbUser.role,
          authProvider: 'google',
        });
      }

      const enquiries = await getCustomerEnquiries(
        req.dbUser!.uid,
        req.supabaseAccessToken
      );
      res.json({
        user: {
          uid: req.dbUser!.uid,
          email: req.dbUser!.email,
          fullName: req.dbUser!.fullName,
          phone: req.dbUser!.phone,
          role: req.dbUser!.role,
        },
        enquiries,
      });
    } catch (error) {
      sendSafeError(res, error, 'Unable to load your profile.');
    }
  });

  app.put('/api/me', requireAuth, async (req: AuthRequest, res) => {
    const fullName =
      typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';

    if (fullName.length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }

    if (phone) {
      const phoneDigits = phone.replace(/[^\d]/g, '');
      if (phoneDigits.length < 8 || phoneDigits.length > 15) {
        res.status(400).json({ error: 'Please enter a valid phone number.' });
        return;
      }
    }

    try {
      const updated = await updateCustomerProfile(
        req.dbUser!.uid,
        {
          fullName,
          phone,
        },
        req.supabaseAccessToken
      );

      const finalUser = updated
        ? {
            uid: updated.uid,
            email: updated.email,
            fullName: updated.fullName,
            phone: updated.phone,
            role: updated.role,
            supabaseUserId: updated.supabaseUserId,
          }
        : {
            uid: req.dbUser!.uid,
            email: req.dbUser!.email,
            fullName: fullName || null,
            phone: phone || null,
            role: req.dbUser!.role,
            supabaseUserId: req.dbUser!.supabaseUserId ?? null,
          };

      const refreshedToken = createSignedSessionToken({
        uid: finalUser.uid,
        email: finalUser.email,
        role: finalUser.role,
        fullName: finalUser.fullName,
        phone: finalUser.phone,
        supabaseUserId: finalUser.supabaseUserId,
      });

      res.json({
        token: refreshedToken,
        user: {
          uid: finalUser.uid,
          email: finalUser.email,
          fullName: finalUser.fullName,
          phone: finalUser.phone,
          role: finalUser.role,
        },
      });
    } catch (error) {
      sendSafeError(res, error, 'Unable to save profile details.');
    }
  });

  // ===========================================================================
  // PROTECTED ADMINISTRATOR ROUTES (server-enforced role === 'admin')
  // ===========================================================================

  app.get('/api/admin/dashboard', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const data = await getAdminCatalogueData(req.supabaseAccessToken);
      res.json(data);
    } catch (error) {
      sendSafeError(res, error, 'Unable to load administrator dashboard.');
    }
  });

  app.get('/api/admin/supabase-status', requireAdmin, async (_req, res) => {
    try {
      const [diagnostics, unsynced, pgHealth] = await Promise.all([
        getSupabaseDiagnostics(),
        getUnsyncedEnquiries(),
        checkPostgresHealth(),
      ]);

      res.json({
        diagnostics,
        pendingOrderSyncCount: unsynced.length,
        architecture: {
          runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
          primaryDatabase: pgHealth.configured ? 'postgresql' : 'supabase-cloud',
          postgresSource: pgHealth.source,
          postgresConnected: pgHealth.connected,
          mediaStorage: diagnostics.storageBucketReady
            ? 'supabase-storage-cdn'
            : pgHealth.configured
              ? 'postgresql-binary'
              : 'inline-data-url',
          serviceRoleConfigured: diagnostics.serviceRoleConfigured,
          sessionSecretConfigured: isSessionSecretConfigured(),
          vercelReady: true,
        },
      });
    } catch (error) {
      sendSafeError(res, error, 'Unable to verify backend connection.');
    }
  });

  app.post('/api/admin/supabase-sync', requireAdmin, async (req: AuthRequest, res) => {
    try {
      const diagnostics = await getSupabaseDiagnostics();
      if (!diagnostics.tablesReady) {
        res.status(400).json({
          error:
            'Supabase tables are not initialized yet. Copy and run the SQL setup script in your Supabase SQL Editor first, then click Verify & Sync.',
          diagnostics,
        });
        return;
      }

      // 1. Sync Categories & Products from PostgreSQL into Supabase (for seamless Vercel portability)
      const localCatalogue = await getAllCatalogueForSupabaseSync();
      let syncedCategoriesCount = 0;
      let syncedProductsCount = 0;

      for (const cat of localCatalogue.categories) {
        const sbCatId = await syncCategoryToSupabase(
          { name: cat.name, slug: cat.slug },
          req.supabaseAccessToken
        );
        if (sbCatId) syncedCategoriesCount += 1;
      }

      for (const row of localCatalogue.products) {
        const p = row.product;
        const c = row.category;
        // Convert any PostgreSQL binary `/api/media/:id` URLs to Supabase Storage CDN URLs when syncing!
        const resolvedUrls: string[] = [];
        for (const imgUrl of p.imageUrls ?? []) {
          const mediaMatch = /^\/api\/media\/(\d+)$/.exec(imgUrl.trim());
          if (mediaMatch) {
            const mediaAsset = await getMediaAssetRecord(Number(mediaMatch[1]));
            if (mediaAsset) {
              const uploaded = await uploadImageToSupabaseStorage({
                filename: mediaAsset.filename,
                mimeType: mediaAsset.mimeType,
                buffer: Buffer.from(mediaAsset.dataBase64, 'base64'),
                accessToken: req.supabaseAccessToken,
              });
              if (uploaded.uploaded && uploaded.publicUrl) {
                resolvedUrls.push(uploaded.publicUrl);
                continue;
              }
            }
          }
          resolvedUrls.push(imgUrl);
        }

        const ok = await syncProductToSupabase(
          {
            categoryName: c.name,
            categorySlug: c.slug,
            title: p.title || p.name,
            slug: p.slug,
            description: p.description,
            priceInr: p.priceInr,
            sku: p.sku,
            imageUrls: resolvedUrls,
            finish: p.finish,
            sizes: p.sizes ?? [],
            isFeatured: p.isFeatured,
            availabilityStatus: p.availabilityStatus,
            isPublished: Boolean(p.isPublished && p.isActive),
          },
          req.supabaseAccessToken
        );
        if (ok) syncedProductsCount += 1;
      }

      // 2. Sync Unsynced Customer Orders & Enquiries
      const unsyncedOrders = await getUnsyncedEnquiries();
      let syncedOrdersCount = 0;

      for (const item of unsyncedOrders) {
        const result = await syncOrderToSupabase(
          {
            localEnquiryId: item.id,
            userUid: item.userUid,
            productId: item.productId,
            productName: item.productName,
            productPriceInr: item.productPriceInr,
            productSku: item.productSku,
            customerName: item.customerName,
            customerPhone: item.customerPhone,
            customerEmail: item.customerEmail,
            preferredSize: item.preferredSize,
            notes: item.notes,
            status: item.status,
            createdAt: item.createdAt.toISOString(),
          },
          req.supabaseAccessToken
        );

        if (result.synced) {
          await markEnquirySyncedToSupabase(item.id);
          syncedOrdersCount += 1;
        }
      }

      // 3. Sync User Login Records
      const allUsers = await getAllUsersForSync();
      let syncedUsersCount = 0;
      const sbClient = createPrivilegedSupabaseClient(req.supabaseAccessToken);

      for (const u of allUsers) {
        const insertRes = await sbClient.from('user_logins').insert({
          user_uid: u.supabaseUserId || u.uid,
          email: u.email,
          full_name: u.fullName,
          phone: u.phone,
          role: u.role === 'admin' ? 'admin' : 'customer',
          auth_provider: 'backfill',
          logged_in_at: u.updatedAt.toISOString(),
        });
        if (!insertRes.error) {
          syncedUsersCount += 1;
        }
      }

      const [remaining, pgHealth] = await Promise.all([
        getUnsyncedEnquiries(),
        checkPostgresHealth(),
      ]);

      res.json({
        ok: true,
        syncedCategoriesCount,
        syncedProductsCount,
        syncedOrdersCount,
        syncedUsersCount,
        pendingOrderSyncCount: remaining.length,
        diagnostics,
        architecture: {
          runtime: process.env.VERCEL ? 'vercel-serverless' : 'node-server',
          primaryDatabase: pgHealth.configured ? 'postgresql' : 'supabase-cloud',
          postgresSource: pgHealth.source,
          postgresConnected: pgHealth.connected,
          mediaStorage: diagnostics.storageBucketReady
            ? 'supabase-storage-cdn'
            : pgHealth.configured
              ? 'postgresql-binary'
              : 'inline-data-url',
          serviceRoleConfigured: diagnostics.serviceRoleConfigured,
          sessionSecretConfigured: isSessionSecretConfigured(),
          vercelReady: true,
        },
      });
    } catch (error) {
      sendSafeError(res, error, 'Unable to sync records to Supabase.');
    }
  });

  app.get('/api/admin/products/:id', requireAdmin, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid product ID.' });
      return;
    }

    try {
      const product = await getAdminProductById(id, req.supabaseAccessToken);
      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      res.json({ product });
    } catch (error) {
      sendSafeError(res, error, 'Unable to load product.');
    }
  });

  app.post('/api/admin/media', requireAdmin, async (req: AuthRequest, res) => {
    const filename =
      typeof req.body?.filename === 'string' && req.body.filename.trim()
        ? req.body.filename.trim().slice(0, 180)
        : 'jewellery-image.jpg';
    const mimeType =
      typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim() : '';
    const rawBase64 =
      typeof req.body?.dataBase64 === 'string' ? req.body.dataBase64.trim() : '';

    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      res.status(400).json({
        error: 'Only JPG, PNG, and WebP jewellery images are supported.',
      });
      return;
    }

    const strippedBase64 = rawBase64.replace(/^data:[^;]+;base64,/, '');
    if (!strippedBase64) {
      res.status(400).json({ error: 'Image file data is empty.' });
      return;
    }

    const buffer = Buffer.from(strippedBase64, 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      res.status(400).json({
        error: 'Each uploaded image must be 4 MB or smaller.',
      });
      return;
    }

    try {
      // Priority 1: Upload to Supabase Storage CDN ('product-images' bucket) for global persistence across Vercel & Cloud Run
      const sbUpload = await uploadImageToSupabaseStorage({
        filename,
        mimeType,
        buffer,
        accessToken: req.supabaseAccessToken,
      });

      if (sbUpload.uploaded && sbUpload.publicUrl) {
        res.status(201).json({
          id: 0,
          storage: 'supabase-storage',
          url: sbUpload.publicUrl,
        });
        return;
      }

      // Priority 2: Store in PostgreSQL media_assets table when PostgreSQL is active
      if (hasPostgresConfig()) {
        const asset = await createMediaAssetRecord({
          filename,
          mimeType,
          dataBase64: strippedBase64,
          sizeBytes: buffer.length,
        });

        res.status(201).json({
          id: asset.id,
          storage: 'postgresql',
          url: `/api/media/${asset.id}`,
        });
        return;
      }

      // Priority 3: Self-contained Data URL fallback when running serverless before storage bucket initialization
      res.status(201).json({
        id: 0,
        storage: 'inline',
        url: `data:${mimeType};base64,${strippedBase64}`,
      });
    } catch (error) {
      sendSafeError(res, error, 'Unable to upload image.');
    }
  });

  app.delete('/api/admin/media/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 0) {
      res.status(400).json({ error: 'Invalid media ID.' });
      return;
    }

    try {
      if (id > 0) {
        await deleteMediaAssetByIdIfUnused(id);
      }
      res.json({ ok: true });
    } catch (error) {
      sendSafeError(res, error, 'Unable to clean up uploaded file.');
    }
  });

  app.post('/api/admin/products', requireAdmin, async (req: AuthRequest, res) => {
    const parsed = validateProductBody((req.body ?? {}) as Record<string, unknown>);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const created = await createProductRecord(parsed.value, req.supabaseAccessToken);
      res.status(201).json({ product: created });
    } catch (error) {
      sendSafeError(res, error, 'Unable to create product.');
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid product ID.' });
      return;
    }

    const parsed = validateProductBody((req.body ?? {}) as Record<string, unknown>);
    if ('error' in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const updated = await updateProductRecord(
        id,
        parsed.value,
        req.supabaseAccessToken
      );
      res.json({ product: updated });
    } catch (error) {
      const status =
        error instanceof Error && error.message === 'Product not found.' ? 404 : 500;
      sendSafeError(res, error, 'Unable to update product.', status);
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid product ID.' });
      return;
    }

    try {
      await deleteProductRecord(id, req.supabaseAccessToken);
      res.json({ ok: true });
    } catch (error) {
      const status =
        error instanceof Error && error.message === 'Product not found.' ? 404 : 500;
      sendSafeError(res, error, 'Unable to delete product.', status);
    }
  });

  app.post('/api/admin/categories', requireAdmin, async (req: AuthRequest, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (name.length < 2 || name.length > 80) {
      res
        .status(400)
        .json({ error: 'Category name must be between 2 and 80 characters.' });
      return;
    }

    try {
      const category = await createCategoryRecord(name, req.supabaseAccessToken);
      res.status(201).json({ category });
    } catch (error) {
      sendSafeError(res, error, 'Unable to create category.', 400);
    }
  });

  app.put('/api/admin/categories/:id', requireAdmin, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!Number.isInteger(id) || id <= 0 || name.length < 2 || name.length > 80) {
      res.status(400).json({
        error: 'Valid category ID and name (2–80 characters) are required.',
      });
      return;
    }

    try {
      const category = await updateCategoryRecord(id, name, req.supabaseAccessToken);
      res.json({ category });
    } catch (error) {
      sendSafeError(res, error, 'Unable to rename category.', 400);
    }
  });

  app.post(
    '/api/admin/categories/:id/reassign',
    requireAdmin,
    async (req: AuthRequest, res) => {
      const fromId = Number(req.params.id);
      const toId = Number(req.body?.targetCategoryId);
      if (
        !Number.isInteger(fromId) ||
        fromId <= 0 ||
        !Number.isInteger(toId) ||
        toId <= 0
      ) {
        res
          .status(400)
          .json({ error: 'Valid source and destination categories are required.' });
        return;
      }

      try {
        await reassignCategoryProductsRecord(fromId, toId, req.supabaseAccessToken);
        res.json({ ok: true });
      } catch (error) {
        sendSafeError(res, error, 'Unable to reassign products.', 400);
      }
    }
  );

  app.delete('/api/admin/categories/:id', requireAdmin, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid category ID.' });
      return;
    }

    try {
      await deleteCategoryRecord(id, req.supabaseAccessToken);
      res.json({ ok: true });
    } catch (error) {
      const isConflict =
        error instanceof Error &&
        error.message.startsWith('Cannot delete this category');
      sendSafeError(
        res,
        error,
        'Unable to delete category.',
        isConflict ? 400 : 500
      );
    }
  });

  app.patch('/api/admin/enquiries/:id', requireAdmin, async (req: AuthRequest, res) => {
    const id = Number(req.params.id);
    const status = typeof req.body?.status === 'string' ? req.body.status.trim() : '';
    if (!Number.isInteger(id) || id <= 0 || !ALLOWED_ENQUIRY_STATUS.has(status)) {
      res.status(400).json({ error: 'Valid enquiry ID and status are required.' });
      return;
    }

    try {
      const updated = await updateEnquiryStatusRecord(
        id,
        status,
        req.supabaseAccessToken
      );
      res.json({ enquiry: updated });
    } catch (error) {
      sendSafeError(res, error, 'Unable to update enquiry status.');
    }
  });

  // Unmatched /api/* routes return JSON 404
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  return app;
}

export const apiApp = createApiApp();
export default apiApp;
