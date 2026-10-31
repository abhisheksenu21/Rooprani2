import crypto from 'node:crypto';
import { and, desc, eq, ne, notInArray, sql } from 'drizzle-orm';
import {
  db,
  ensurePostgresSchemaInitialized,
  hasPostgresConfig,
} from './index.ts';
import { hashPassword, verifyPassword } from '../lib/security.ts';
import {
  createPrivilegedSupabaseClient,
  createServerSupabaseClient,
  deleteImagesFromSupabaseStorage,
  deleteProductFromSupabaseBySlug,
  syncCategoryToSupabase,
  syncOrderToSupabase,
  syncProductToSupabase,
} from '../lib/supabase-server.ts';
import {
  categories,
  enquiries,
  mediaAssets,
  products,
  users,
} from './schema.ts';

export interface AppUserRecord {
  uid: string;
  email: string;
  passwordHash: string | null;
  supabaseUserId: string | null;
  fullName: string | null;
  phone: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const BOOTSTRAP_ADMIN_EMAILS = new Set(
  [
    'roopranijwellery@gmail.com',
    'roopranijewellery@gmail.com',
    'abhisheksentit@gmail.com',
    ...(process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : []),
  ]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

// Salted cryptographic scrypt hash for authorized initial owner account (no plaintext stored)
const ADMIN_BOOTSTRAP_SCRYPT_HASH =
  process.env.ADMIN_BOOTSTRAP_PASSWORD_HASH ||
  'scrypt$0b1ea915e567a3773bcf569a6858478e$016eadf2e668cd7d8987eef60c6ee433939f93b3b9935939d7cf784532f9ff25ebfcf61d9b0786f238a57bd17eb1403b654f4220cdfc317721ad9629bf6a9c7b';

export const INITIAL_CATEGORIES = [
  { id: 1, name: 'Bangles', slug: 'bangles' },
  { id: 2, name: 'Kade', slug: 'kade' },
  { id: 3, name: 'Earrings', slug: 'earrings' },
  { id: 4, name: 'Necklaces', slug: 'necklaces' },
  { id: 5, name: 'Bentex Jewellery', slug: 'bentex-jewellery' },
  { id: 6, name: 'Accessories', slug: 'accessories' },
] as const;

export const INITIAL_PRODUCTS_SEED = [
  {
    id: 1,
    category_id: 4,
    category_slug: 'necklaces',
    title: 'Rajwada Polki & Pearl Choker',
    slug: 'rajwada-polki-pearl-choker',
    description:
      'An antique champagne-gold choker set with uncut polki-style glass stones, fine granulation detailing, and luminous cream pearl drops designed to rest gracefully along the collarbone.',
    price_inr: 3450,
    sku: 'RR-NK-101',
    image_urls: ['/catalogue/kundan-necklace.jpg'],
    finish: 'Antique Champagne Gold',
    sizes: ['Adjustable Dori'],
    is_featured: true,
    availability_status: 'in_stock',
    is_published: true,
  },
  {
    id: 2,
    category_id: 1,
    category_slug: 'bangles',
    title: 'Noor Filigree Chooda Set (Set of 4)',
    slug: 'noor-filigree-chooda-bangles',
    description:
      'Finely engraved artificial gold bangles featuring floral jaali relief work and beaded rims, balanced for effortless everyday layering or festive ensembles.',
    price_inr: 1680,
    sku: 'RR-BG-204',
    image_urls: ['/catalogue/gold-bangles.jpg'],
    finish: '22K-Tone Matte Gold',
    sizes: ['2.4', '2.6', '2.8'],
    is_featured: false,
    availability_status: 'in_stock',
    is_published: true,
  },
  {
    id: 3,
    category_id: 2,
    category_slug: 'kade',
    title: 'Mewar Meenakari Hinged Kade (Pair)',
    slug: 'mewar-meenakari-hinged-kade',
    description:
      'Sculpted Rajasthani hinged kade bracelets adorned with peacock relief carving and subtle deep ruby and emerald enamel accents, secured with precision screw clasps.',
    price_inr: 2490,
    sku: 'RR-KD-309',
    image_urls: ['/catalogue/sculpted-kade.jpg'],
    finish: 'Heritage Gold & Enamel',
    sizes: ['2.4', '2.6', '2.8'],
    is_featured: false,
    availability_status: 'limited',
    is_published: true,
  },
  {
    id: 4,
    category_id: 3,
    category_slug: 'earrings',
    title: 'Meher Chandbali Jhumka Earrings',
    slug: 'meher-chandbali-jhumka-earrings',
    description:
      'Crescent chandbali silhouettes suspended above finely beaded jhumka bells, accented with ruby-toned cabochons and delicate pearl droplets.',
    price_inr: 1290,
    sku: 'RR-ER-412',
    image_urls: ['/catalogue/chandbali-earrings.jpg'],
    finish: 'Oxidised Champagne Gold',
    sizes: [],
    is_featured: false,
    availability_status: 'in_stock',
    is_published: true,
  },
  {
    id: 5,
    category_id: 5,
    category_slug: 'bentex-jewellery',
    title: 'Padmavati Bentex Temple Rani Haar Set',
    slug: 'padmavati-bentex-temple-rani-haar',
    description:
      'Traditional Bentex gold-toned long temple necklace crafted with stamped lotus and coin motifs, paired with matching lotus ear studs for classic bridal and festive wear.',
    price_inr: 2950,
    sku: 'RR-BX-501',
    image_urls: ['/catalogue/bentex-haar.jpg'],
    finish: 'Traditional Bentex Matte Gold',
    sizes: ['Long Haar + Matching Studs'],
    is_featured: false,
    availability_status: 'in_stock',
    is_published: true,
  },
  {
    id: 6,
    category_id: 6,
    category_slug: 'accessories',
    title: 'Zari Pearl Maang Tikka & Hathphool Suite',
    slug: 'zari-pearl-maang-tikka-hathphool',
    description:
      'Delicate multi-strand pearl hathphool hand harness paired with a crescent filigree maang tikka, crafted for intimate celebrations and wedding festivities.',
    price_inr: 1850,
    sku: 'RR-AC-608',
    image_urls: ['/catalogue/maang-tikka.jpg'],
    finish: 'Champagne Gold & Pearl',
    sizes: ['Free Size Adjustable'],
    is_featured: false,
    availability_status: 'made_to_order',
    is_published: true,
  },
] as const;

let categoriesSeedChecked = false;
let adminSeedChecked = false;

export function isAuthorizedBootstrapAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function slugifyText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isSupabaseSchemaMissingError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === 'PGRST205' ||
    err.code === '42P01' ||
    msg.includes('could not find the table') ||
    msg.includes('does not exist')
  );
}

function throwHelpfulSupabaseWriteError(err: { code?: string; message?: string } | null, fallback: string): never {
  if (isSupabaseSchemaMissingError(err)) {
    throw new Error(
      'Supabase tables are not initialized yet. Open Dashboard Overview -> click "1. Copy SQL Schema" and run it once in your Supabase SQL Editor.'
    );
  }
  if (err && /row-level security/i.test(err.message || '')) {
    throw new Error(
      'Supabase RLS blocked this write. Make sure you ran "1. Copy SQL Schema" in your Supabase SQL Editor, then Sign Out and Sign In once with roopranijwellery@gmail.com to refresh your admin session.'
    );
  }
  throw new Error(err?.message || fallback);
}

export async function ensureInitialCategoriesSeeded() {
  if (!hasPostgresConfig()) return;
  if (categoriesSeedChecked) return;
  try {
    await ensurePostgresSchemaInitialized();
    const existing = await db.select({ id: categories.id }).from(categories).limit(1);
    if (existing.length === 0) {
      await db
        .insert(categories)
        .values(
          INITIAL_CATEGORIES.map((c) => ({
            name: c.name,
            slug: c.slug,
          }))
        )
        .onConflictDoNothing({ target: categories.slug });

      // Seed curated initial pieces only when bootstrapping a brand-new empty database
      const existingProducts = await db.select({ id: products.id }).from(products).limit(1);
      if (existingProducts.length === 0) {
        const seededCats = await db.select().from(categories);
        const catIdBySlug = new Map(seededCats.map((c) => [c.slug, c.id]));
        for (const item of INITIAL_PRODUCTS_SEED) {
          const resolvedCatId = catIdBySlug.get(item.category_slug);
          if (!resolvedCatId) continue;
          await db
            .insert(products)
            .values({
              categoryId: resolvedCatId,
              title: item.title,
              name: item.title,
              slug: item.slug,
              description: item.description,
              priceInr: item.price_inr,
              sku: item.sku,
              imageUrls: [...item.image_urls],
              finish: item.finish,
              sizes: [...item.sizes],
              isFeatured: item.is_featured,
              availabilityStatus: item.availability_status,
              isPublished: item.is_published,
              isActive: item.is_published,
            })
            .onConflictDoNothing({ target: products.slug });
        }
      }
    }
    categoriesSeedChecked = true;
  } catch (error) {
    console.error('Database error in ensureInitialCategoriesSeeded:', error);
  }
}

export async function ensureInitialAdminSeeded() {
  if (!hasPostgresConfig()) return;
  if (adminSeedChecked) return;
  try {
    await ensurePostgresSchemaInitialized();
    const ownerEmails = ['roopranijwellery@gmail.com', 'roopranijewellery@gmail.com'];
    for (const ownerEmail of ownerEmails) {
      const rows = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${ownerEmail}`)
        .limit(1);

      const existing = rows[0];
      if (!existing) {
        const uid =
          ownerEmail === 'roopranijwellery@gmail.com'
            ? 'admin_rooprani_owner'
            : 'admin_rooprani_owner_alt';
        await db
          .insert(users)
          .values({
            uid,
            email: ownerEmail,
            passwordHash: ADMIN_BOOTSTRAP_SCRYPT_HASH,
            fullName: 'Rooprani Administrator',
            role: 'admin',
          })
          .onConflictDoUpdate({
            target: users.uid,
            set: {
              role: 'admin',
              passwordHash: ADMIN_BOOTSTRAP_SCRYPT_HASH,
              updatedAt: new Date(),
            },
          });
      } else if (!existing.passwordHash || existing.role !== 'admin') {
        await db
          .update(users)
          .set({
            role: 'admin',
            passwordHash: existing.passwordHash || ADMIN_BOOTSTRAP_SCRYPT_HASH,
            updatedAt: new Date(),
          })
          .where(eq(users.uid, existing.uid));
      }
    }
    adminSeedChecked = true;
  } catch (error) {
    console.error('Database error in ensureInitialAdminSeeded:', error);
  }
}

function buildBootstrapOwnerVirtualUser(email: string): AppUserRecord {
  const clean = email.trim().toLowerCase();
  const now = new Date();
  return {
    uid: clean === 'roopranijwellery@gmail.com' ? 'admin_rooprani_owner' : 'admin_rooprani_owner_alt',
    email: clean,
    passwordHash: ADMIN_BOOTSTRAP_SCRYPT_HASH,
    supabaseUserId: null,
    fullName: 'Rooprani Administrator',
    phone: null,
    role: 'admin',
    createdAt: now,
    updatedAt: now,
  };
}

export async function getUserByEmail(
  email: string,
  supabaseAccessToken?: string
): Promise<AppUserRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  if (hasPostgresConfig()) {
    try {
      await ensurePostgresSchemaInitialized();
      const rows = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${cleanEmail}`)
        .limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error('Database error in getUserByEmail:', error);
      return null;
    }
  }

  // Supabase Cloud Mode (Vercel without PostgreSQL URL)
  try {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const { data } = await client
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (data) {
      return {
        uid: String(data.id),
        email: String(data.email),
        passwordHash:
          cleanEmail === 'roopranijwellery@gmail.com' ||
          cleanEmail === 'roopranijewellery@gmail.com'
            ? ADMIN_BOOTSTRAP_SCRYPT_HASH
            : null,
        supabaseUserId: String(data.id),
        fullName: data.full_name ?? null,
        phone: data.phone ?? null,
        role: isAuthorizedBootstrapAdmin(cleanEmail) ? 'admin' : String(data.role || 'customer'),
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      };
    }
  } catch {
    // Fall through to bootstrap check
  }

  if (
    cleanEmail === 'roopranijwellery@gmail.com' ||
    cleanEmail === 'roopranijewellery@gmail.com'
  ) {
    return buildBootstrapOwnerVirtualUser(cleanEmail);
  }

  return null;
}

export async function getUserByUid(
  uid: string,
  supabaseAccessToken?: string
): Promise<AppUserRecord | null> {
  if (!uid) return null;

  if (hasPostgresConfig()) {
    try {
      await ensurePostgresSchemaInitialized();
      const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
      if (rows[0]) {
        return rows[0];
      }
    } catch (error) {
      console.error('Database error in getUserByUid:', error);
    }
  }

  if (uid === 'admin_rooprani_owner') {
    return buildBootstrapOwnerVirtualUser('roopranijwellery@gmail.com');
  }
  if (uid === 'admin_rooprani_owner_alt') {
    return buildBootstrapOwnerVirtualUser('roopranijewellery@gmail.com');
  }

  try {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const { data } = await client.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (data) {
      const cleanEmail = String(data.email || '').toLowerCase();
      return {
        uid: String(data.id),
        email: cleanEmail,
        passwordHash: null,
        supabaseUserId: String(data.id),
        fullName: data.full_name ?? null,
        phone: data.phone ?? null,
        role: isAuthorizedBootstrapAdmin(cleanEmail) ? 'admin' : String(data.role || 'customer'),
        createdAt: data.created_at ? new Date(data.created_at) : new Date(),
        updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
      };
    }
  } catch {
    // Non-fatal if profiles table is pending initialization
  }

  return null;
}

export async function upsertUserFromAuth(params: {
  uid: string;
  email: string;
  displayName?: string | null;
  phone?: string | null;
  supabaseUserId?: string | null;
  emailVerified: boolean;
  supabaseAccessToken?: string;
}): Promise<AppUserRecord> {
  const cleanEmail = params.email.trim().toLowerCase();
  const shouldPromoteAdmin = isAuthorizedBootstrapAdmin(cleanEmail);

  if (!hasPostgresConfig()) {
    const now = new Date();
    const role = shouldPromoteAdmin ? 'admin' : 'customer';
    try {
      if (params.supabaseUserId) {
        const client = createPrivilegedSupabaseClient(params.supabaseAccessToken);
        const { data } = await client
          .from('profiles')
          .select('*')
          .eq('id', params.supabaseUserId)
          .maybeSingle();
        if (data) {
          return {
            uid: String(data.id),
            email: cleanEmail,
            passwordHash: null,
            supabaseUserId: String(data.id),
            fullName: data.full_name || params.displayName || null,
            phone: data.phone || params.phone || null,
            role: shouldPromoteAdmin ? 'admin' : String(data.role || 'customer'),
            createdAt: data.created_at ? new Date(data.created_at) : now,
            updatedAt: data.updated_at ? new Date(data.updated_at) : now,
          };
        }
      }
    } catch {
      // Fallback to verified session claims
    }

    return {
      uid: params.uid,
      email: cleanEmail,
      passwordHash: null,
      supabaseUserId: params.supabaseUserId || null,
      fullName: params.displayName || null,
      phone: params.phone || null,
      role,
      createdAt: now,
      updatedAt: now,
    };
  }

  try {
    await ensureInitialAdminSeeded();

    let existingRows = await db
      .select()
      .from(users)
      .where(eq(users.uid, params.uid))
      .limit(1);

    if (!existingRows[0] && cleanEmail) {
      existingRows = await db
        .select()
        .from(users)
        .where(sql`lower(${users.email}) = ${cleanEmail}`)
        .limit(1);
    }

    const existing = existingRows[0];

    if (!existing) {
      const inserted = await db
        .insert(users)
        .values({
          uid: params.uid,
          email: cleanEmail,
          supabaseUserId: params.supabaseUserId || null,
          fullName: params.displayName || null,
          phone: params.phone || null,
          role: shouldPromoteAdmin ? 'admin' : 'customer',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email: cleanEmail,
            ...(shouldPromoteAdmin ? { role: 'admin' } : {}),
            updatedAt: new Date(),
          },
        })
        .returning();
      return inserted[0];
    }

    const nextRole = shouldPromoteAdmin ? 'admin' : existing.role;
    const nextName = existing.fullName || params.displayName || null;
    const nextPhone = existing.phone || params.phone || null;
    const nextSupabaseId = params.supabaseUserId || existing.supabaseUserId || null;

    if (
      existing.email !== cleanEmail ||
      existing.role !== nextRole ||
      existing.fullName !== nextName ||
      existing.phone !== nextPhone ||
      existing.supabaseUserId !== nextSupabaseId
    ) {
      const updated = await db
        .update(users)
        .set({
          email: cleanEmail,
          fullName: nextName,
          phone: nextPhone,
          supabaseUserId: nextSupabaseId,
          role: nextRole,
          updatedAt: new Date(),
        })
        .where(eq(users.uid, existing.uid))
        .returning();
      return updated[0];
    }

    return existing;
  } catch (error) {
    console.error('Database error in upsertUserFromAuth:', error);
    throw new Error('Unable to synchronize user account.', { cause: error });
  }
}

export async function authenticateUserWithPassword(
  email: string,
  passwordPlain: string
): Promise<AppUserRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !passwordPlain) return null;

  const isBootstrapOwnerEmail =
    cleanEmail === 'roopranijwellery@gmail.com' ||
    cleanEmail === 'roopranijewellery@gmail.com';

  if (hasPostgresConfig()) {
    await ensureInitialAdminSeeded();
    const user = await getUserByEmail(cleanEmail);
    if (user && user.passwordHash && verifyPassword(passwordPlain, user.passwordHash)) {
      if (isAuthorizedBootstrapAdmin(cleanEmail) && user.role !== 'admin') {
        try {
          const updated = await db
            .update(users)
            .set({ role: 'admin', updatedAt: new Date() })
            .where(eq(users.uid, user.uid))
            .returning();
          return updated[0] ?? { ...user, role: 'admin' };
        } catch {
          return { ...user, role: 'admin' };
        }
      }
      return user;
    }

    // Fallback for authorized store owner if DB row had no password hash or DB was unreachable
    if (isBootstrapOwnerEmail && verifyPassword(passwordPlain, ADMIN_BOOTSTRAP_SCRYPT_HASH)) {
      return user ? { ...user, role: 'admin' } : buildBootstrapOwnerVirtualUser(cleanEmail);
    }

    return null;
  }

  // Supabase Cloud Mode: check authorized bootstrap owner hash first (works even before Supabase email confirmation)
  if (isBootstrapOwnerEmail && verifyPassword(passwordPlain, ADMIN_BOOTSTRAP_SCRYPT_HASH)) {
    return buildBootstrapOwnerVirtualUser(cleanEmail);
  }

  return null;
}

export async function registerCustomerWithPassword(params: {
  email: string;
  passwordPlain: string;
  fullName: string;
  phone?: string | null;
  supabaseUserId?: string | null;
}): Promise<AppUserRecord> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim();
  const cleanPhone = params.phone?.trim() || null;

  if (!hasPostgresConfig()) {
    if (isAuthorizedBootstrapAdmin(cleanEmail)) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    const now = new Date();
    const uid = params.supabaseUserId || `cust_${crypto.randomUUID()}`;
    return {
      uid,
      email: cleanEmail,
      passwordHash: null,
      supabaseUserId: params.supabaseUserId || null,
      fullName: cleanName || null,
      phone: cleanPhone,
      role: 'customer',
      createdAt: now,
      updatedAt: now,
    };
  }

  await ensureInitialAdminSeeded();

  const existing = await getUserByEmail(cleanEmail);
  if (existing && existing.passwordHash) {
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  const passwordHash = hashPassword(params.passwordPlain);

  if (existing) {
    const updated = await db
      .update(users)
      .set({
        passwordHash,
        fullName: existing.fullName || cleanName || null,
        phone: existing.phone || cleanPhone,
        supabaseUserId: params.supabaseUserId || existing.supabaseUserId || null,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, existing.uid))
      .returning();
    return updated[0];
  }

  const uid = params.supabaseUserId || `cust_${crypto.randomUUID()}`;
  const inserted = await db
    .insert(users)
    .values({
      uid,
      email: cleanEmail,
      passwordHash,
      supabaseUserId: params.supabaseUserId || null,
      fullName: cleanName || null,
      phone: cleanPhone,
      role: 'customer',
    })
    .returning();

  return inserted[0];
}

export async function linkSupabaseUserId(uid: string, supabaseUserId: string) {
  if (!uid || !supabaseUserId || !hasPostgresConfig()) return;
  try {
    await db
      .update(users)
      .set({ supabaseUserId, updatedAt: new Date() })
      .where(eq(users.uid, uid));
  } catch (error) {
    console.warn('Non-fatal linkSupabaseUserId warning:', error);
  }
}

export async function updateCustomerProfile(
  uid: string,
  payload: { fullName: string; phone: string },
  supabaseAccessToken?: string
): Promise<AppUserRecord | null> {
  if (!hasPostgresConfig()) {
    try {
      const client = createPrivilegedSupabaseClient(supabaseAccessToken);
      const { data, error } = await client
        .from('profiles')
        .update({
          full_name: payload.fullName.trim() || null,
          phone: payload.phone.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', uid)
        .select('*')
        .maybeSingle();

      if (!error && data) {
        const cleanEmail = String(data.email || '').toLowerCase();
        return {
          uid: String(data.id),
          email: cleanEmail,
          passwordHash: null,
          supabaseUserId: String(data.id),
          fullName: data.full_name ?? null,
          phone: data.phone ?? null,
          role: isAuthorizedBootstrapAdmin(cleanEmail) ? 'admin' : String(data.role || 'customer'),
          createdAt: data.created_at ? new Date(data.created_at) : new Date(),
          updatedAt: new Date(),
        };
      }
    } catch {
      // Ignore if profiles table not yet initialized
    }
    return null;
  }

  try {
    const updated = await db
      .update(users)
      .set({
        fullName: payload.fullName.trim() || null,
        phone: payload.phone.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(users.uid, uid))
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error('Database error in updateCustomerProfile:', error);
    throw new Error('Unable to save profile details.', { cause: error });
  }
}

export function mapProductRecord(
  p: typeof products.$inferSelect,
  c: typeof categories.$inferSelect
) {
  const resolvedTitle = (p.title && p.title.trim()) || p.name;
  const resolvedPublished = Boolean(p.isPublished && p.isActive);
  return {
    id: String(p.id),
    numeric_id: p.id,
    title: resolvedTitle,
    name: resolvedTitle,
    slug: p.slug,
    description: p.description,
    price_inr: p.priceInr,
    sku: p.sku,
    category_id: String(c.id),
    category_name: c.name,
    category_slug: c.slug,
    image_urls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
    variants: {
      finish: p.finish || undefined,
      sizes: Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : undefined,
    },
    is_published: resolvedPublished,
    is_active: resolvedPublished,
    is_featured: p.isFeatured,
    availability_status: p.availabilityStatus,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

function mapSupabaseProductRow(
  p: Record<string, unknown>,
  catMap: Map<number, { id: number; name: string; slug: string }>
) {
  const catId = Number(p.category_id);
  const category = catMap.get(catId) ?? {
    id: catId || 1,
    name: 'Jewellery',
    slug: 'jewellery',
  };
  const title = String(p.title || p.name || '');
  const imageUrls = Array.isArray(p.image_urls)
    ? (p.image_urls as unknown[]).filter((u): u is string => typeof u === 'string')
    : [];
  const sizes = Array.isArray(p.sizes)
    ? (p.sizes as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const isPublished = p.is_published !== false;
  const createdAt = typeof p.created_at === 'string' ? p.created_at : new Date().toISOString();
  const updatedAt = typeof p.updated_at === 'string' ? p.updated_at : createdAt;

  return {
    id: String(p.id),
    numeric_id: Number(p.id),
    title,
    name: title,
    slug: String(p.slug || ''),
    description: String(p.description || ''),
    price_inr: Number(p.price_inr || 0),
    sku: typeof p.sku === 'string' ? p.sku : null,
    category_id: String(category.id),
    category_name: category.name,
    category_slug: category.slug,
    image_urls: imageUrls,
    variants: {
      finish: typeof p.finish === 'string' && p.finish ? p.finish : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
    },
    is_published: isPublished,
    is_active: isPublished,
    is_featured: Boolean(p.is_featured),
    availability_status: String(p.availability_status || 'available'),
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

async function getSupabasePublicCatalogueFallback() {
  const client = createServerSupabaseClient();
  const [catRes, prodRes] = await Promise.all([
    client.from('categories').select('*').order('id', { ascending: true }),
    client
      .from('products')
      .select('*')
      .eq('is_published', true)
      .not('availability_status', 'in', '("unavailable","out_of_stock")')
      .order('is_featured', { ascending: false })
      .order('updated_at', { ascending: false }),
  ]);

  const nowIso = new Date().toISOString();
  const rawCats =
    !catRes.error && Array.isArray(catRes.data) && catRes.data.length > 0
      ? catRes.data
      : INITIAL_CATEGORIES.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          created_at: nowIso,
          updated_at: nowIso,
        }));

  const catMap = new Map<number, { id: number; name: string; slug: string }>();
  for (const c of rawCats) {
    catMap.set(Number(c.id), {
      id: Number(c.id),
      name: String(c.name),
      slug: String(c.slug),
    });
  }

  const rawProds =
    !prodRes.error && Array.isArray(prodRes.data)
      ? prodRes.data
      : isSupabaseSchemaMissingError(prodRes.error)
        ? INITIAL_PRODUCTS_SEED.map((p) => ({
            ...p,
            image_urls: [...p.image_urls],
            sizes: [...p.sizes],
            created_at: nowIso,
            updated_at: nowIso,
          }))
        : [];

  return {
    categories: rawCats.map((c) => ({
      id: String(c.id),
      numeric_id: Number(c.id),
      name: String(c.name),
      slug: String(c.slug),
      created_at: String(c.created_at || nowIso),
      updated_at: String(c.updated_at || nowIso),
    })),
    products: rawProds.map((p) => mapSupabaseProductRow(p as Record<string, unknown>, catMap)),
  };
}

export async function getPublicCatalogue() {
  if (!hasPostgresConfig()) {
    return getSupabasePublicCatalogueFallback();
  }

  try {
    await ensureInitialCategoriesSeeded();

    const categoryRows = await db.select().from(categories).orderBy(categories.id);
    const productRows = await db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(
        and(
          eq(products.isPublished, true),
          eq(products.isActive, true),
          notInArray(products.availabilityStatus, ['unavailable', 'out_of_stock'])
        )
      )
      .orderBy(desc(products.isFeatured), desc(products.updatedAt));

    return {
      categories: categoryRows.map((c) => ({
        id: String(c.id),
        numeric_id: c.id,
        name: c.name,
        slug: c.slug,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
      })),
      products: productRows.map((row) => mapProductRecord(row.product, row.category)),
    };
  } catch (error) {
    console.error('Database error in getPublicCatalogue; falling back to Supabase Cloud:', error);
    return getSupabasePublicCatalogueFallback();
  }
}

export async function getAdminCatalogueData(supabaseAccessToken?: string) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const [catRes, prodRes, enqRes] = await Promise.all([
      client.from('categories').select('*').order('id', { ascending: true }),
      client.from('products').select('*').order('updated_at', { ascending: false }),
      client.from('enquiries').select('*').order('created_at', { ascending: false }),
    ]);

    const nowIso = new Date().toISOString();
    const rawCats =
      !catRes.error && Array.isArray(catRes.data) && catRes.data.length > 0
        ? catRes.data
        : INITIAL_CATEGORIES.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            created_at: nowIso,
            updated_at: nowIso,
          }));

    const catMap = new Map<number, { id: number; name: string; slug: string }>();
    for (const c of rawCats) {
      catMap.set(Number(c.id), {
        id: Number(c.id),
        name: String(c.name),
        slug: String(c.slug),
      });
    }

    const rawProds = !prodRes.error && Array.isArray(prodRes.data)
      ? prodRes.data
      : isSupabaseSchemaMissingError(prodRes.error)
        ? INITIAL_PRODUCTS_SEED.map((p) => ({
            ...p,
            image_urls: [...p.image_urls],
            sizes: [...p.sizes],
            created_at: nowIso,
            updated_at: nowIso,
          }))
        : [];
    const rawEnqs = !enqRes.error && Array.isArray(enqRes.data) ? enqRes.data : [];

    const countsByCategory = new Map<number, number>();
    let publishedCount = 0;
    let draftCount = 0;

    for (const p of rawProds) {
      const cid = Number(p.category_id);
      countsByCategory.set(cid, (countsByCategory.get(cid) ?? 0) + 1);
      if (p.is_published !== false) {
        publishedCount += 1;
      } else {
        draftCount += 1;
      }
    }

    return {
      summary: {
        totalProducts: rawProds.length,
        publishedProducts: publishedCount,
        draftProducts: draftCount,
        totalCategories: rawCats.length,
      },
      categories: rawCats.map((c) => ({
        id: String(c.id),
        numeric_id: Number(c.id),
        name: String(c.name),
        slug: String(c.slug),
        product_count: countsByCategory.get(Number(c.id)) ?? 0,
        created_at: String(c.created_at || nowIso),
        updated_at: String(c.updated_at || nowIso),
      })),
      products: rawProds.map((p) => mapSupabaseProductRow(p as Record<string, unknown>, catMap)),
      enquiries: rawEnqs.map((e) => ({
        id: Number(e.id),
        user_uid: (e.user_uid as string | null) ?? null,
        product_id: e.product_id !== null && e.product_id !== undefined ? Number(e.product_id) : null,
        product_name: String(e.product_name || 'Direct Boutique Enquiry'),
        product_price_inr:
          e.product_price_inr !== null && e.product_price_inr !== undefined
            ? Number(e.product_price_inr)
            : null,
        product_sku: typeof e.product_sku === 'string' ? e.product_sku : null,
        customer_name: String(e.customer_name || ''),
        customer_phone: String(e.customer_phone || ''),
        customer_email: String(e.customer_email || ''),
        preferred_size: typeof e.preferred_size === 'string' ? e.preferred_size : null,
        notes: typeof e.notes === 'string' ? e.notes : null,
        status: String(e.status || 'new'),
        created_at: String(e.created_at || nowIso),
      })),
    };
  }

  try {
    await ensureInitialCategoriesSeeded();

    const categoryRows = await db.select().from(categories).orderBy(categories.id);
    const productRows = await db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(desc(products.updatedAt));

    const enquiryRows = await db
      .select()
      .from(enquiries)
      .orderBy(desc(enquiries.createdAt));

    const countsByCategory = new Map<number, number>();
    let publishedCount = 0;
    let draftCount = 0;

    for (const row of productRows) {
      countsByCategory.set(
        row.category.id,
        (countsByCategory.get(row.category.id) ?? 0) + 1
      );
      if (row.product.isPublished && row.product.isActive) {
        publishedCount += 1;
      } else {
        draftCount += 1;
      }
    }

    return {
      summary: {
        totalProducts: productRows.length,
        publishedProducts: publishedCount,
        draftProducts: draftCount,
        totalCategories: categoryRows.length,
      },
      categories: categoryRows.map((c) => ({
        id: String(c.id),
        numeric_id: c.id,
        name: c.name,
        slug: c.slug,
        product_count: countsByCategory.get(c.id) ?? 0,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString(),
      })),
      products: productRows.map((row) => mapProductRecord(row.product, row.category)),
      enquiries: enquiryRows.map((e) => ({
        id: e.id,
        user_uid: e.userUid,
        product_id: e.productId,
        product_name: e.productName,
        product_price_inr: e.productPriceInr,
        product_sku: e.productSku,
        customer_name: e.customerName,
        customer_phone: e.customerPhone,
        customer_email: e.customerEmail,
        preferred_size: e.preferredSize,
        notes: e.notes,
        status: e.status,
        created_at: e.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error('Database error in getAdminCatalogueData:', error);
    throw new Error('Unable to load administrator dashboard data.', { cause: error });
  }
}

export async function getAdminProductById(id: number, supabaseAccessToken?: string) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const { data: prodRow, error } = await client
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !prodRow) {
      if (isSupabaseSchemaMissingError(error)) {
        const seedItem = INITIAL_PRODUCTS_SEED.find((p) => p.id === id);
        if (seedItem) {
          const catMap = new Map<number, { id: number; name: string; slug: string }>(
            INITIAL_CATEGORIES.map((c) => [c.id, { id: c.id, name: c.name, slug: c.slug }])
          );
          return mapSupabaseProductRow(
            {
              ...seedItem,
              image_urls: [...seedItem.image_urls],
              sizes: [...seedItem.sizes],
            },
            catMap
          );
        }
      }
      return null;
    }

    const { data: catRow } = await client
      .from('categories')
      .select('*')
      .eq('id', Number(prodRow.category_id))
      .maybeSingle();

    const catMap = new Map<number, { id: number; name: string; slug: string }>();
    if (catRow) {
      catMap.set(Number(catRow.id), {
        id: Number(catRow.id),
        name: String(catRow.name),
        slug: String(catRow.slug),
      });
    }
    return mapSupabaseProductRow(prodRow as Record<string, unknown>, catMap);
  }

  try {
    await ensurePostgresSchemaInitialized();
    const rows = await db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!rows[0]) return null;
    return mapProductRecord(rows[0].product, rows[0].category);
  } catch (error) {
    console.error('Database error in getAdminProductById:', error);
    throw new Error('Unable to load product details.', { cause: error });
  }
}

export async function createCategoryRecord(name: string, supabaseAccessToken?: string) {
  const trimmed = name.trim();
  const baseSlug = slugifyText(trimmed);
  if (!trimmed || !baseSlug) {
    throw new Error('Category name is required.');
  }

  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const existing = await client
      .from('categories')
      .select('id')
      .eq('slug', baseSlug)
      .maybeSingle();
    if (existing.error) {
      throwHelpfulSupabaseWriteError(existing.error, 'Unable to check existing categories.');
    }
    if (existing.data) {
      throw new Error(`A category named "${trimmed}" already exists.`);
    }

    const inserted = await client
      .from('categories')
      .insert({
        name: trimmed,
        slug: baseSlug,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (inserted.error || !inserted.data) {
      throwHelpfulSupabaseWriteError(inserted.error, 'Unable to create category.');
    }

    const c = inserted.data;
    return {
      id: String(c.id),
      numeric_id: Number(c.id),
      name: String(c.name),
      slug: String(c.slug),
      product_count: 0,
      created_at: String(c.created_at),
      updated_at: String(c.updated_at),
    };
  }

  try {
    const duplicate = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, baseSlug))
      .limit(1);

    if (duplicate.length > 0) {
      throw new Error(`A category named "${trimmed}" already exists.`);
    }

    const inserted = await db
      .insert(categories)
      .values({
        name: trimmed,
        slug: baseSlug,
        updatedAt: new Date(),
      })
      .returning();
    const c = inserted[0];

    void syncCategoryToSupabase({ name: c.name, slug: c.slug }, supabaseAccessToken);

    return {
      id: String(c.id),
      numeric_id: c.id,
      name: c.name,
      slug: c.slug,
      product_count: 0,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('already exists')) {
      throw error;
    }
    console.error('Database error in createCategoryRecord:', error);
    throw new Error('A category with a similar name already exists or could not be created.', {
      cause: error,
    });
  }
}

export async function updateCategoryRecord(
  id: number,
  name: string,
  supabaseAccessToken?: string
) {
  const trimmed = name.trim();
  const nextSlug = slugifyText(trimmed);
  if (!trimmed || !nextSlug) {
    throw new Error('Category name is required.');
  }

  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const conflict = await client
      .from('categories')
      .select('id')
      .eq('slug', nextSlug)
      .neq('id', id)
      .maybeSingle();

    if (conflict.data) {
      throw new Error(`Another category already uses the name "${trimmed}".`);
    }

    const updated = await client
      .from('categories')
      .update({
        name: trimmed,
        slug: nextSlug,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (updated.error) {
      throwHelpfulSupabaseWriteError(updated.error, 'Unable to rename category.');
    }
    if (!updated.data) {
      throw new Error('Category not found.');
    }

    return {
      id: String(updated.data.id),
      numeric_id: Number(updated.data.id),
      name: String(updated.data.name),
      slug: String(updated.data.slug),
      created_at: String(updated.data.created_at),
      updated_at: String(updated.data.updated_at),
    };
  }

  try {
    const conflicting = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.slug, nextSlug), ne(categories.id, id)))
      .limit(1);

    if (conflicting.length > 0) {
      throw new Error(`Another category already uses the name "${trimmed}".`);
    }

    const updated = await db
      .update(categories)
      .set({
        name: trimmed,
        slug: nextSlug,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();
    if (!updated[0]) {
      throw new Error('Category not found.');
    }

    void syncCategoryToSupabase(
      { name: updated[0].name, slug: updated[0].slug },
      supabaseAccessToken
    );

    return {
      id: String(updated[0].id),
      numeric_id: updated[0].id,
      name: updated[0].name,
      slug: updated[0].slug,
      created_at: updated[0].createdAt.toISOString(),
      updated_at: updated[0].updatedAt.toISOString(),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Another category') || error.message === 'Category not found.')
    ) {
      throw error;
    }
    console.error('Database error in updateCategoryRecord:', error);
    throw new Error('Unable to rename category.', { cause: error });
  }
}

export async function reassignCategoryProductsRecord(
  fromCategoryId: number,
  toCategoryId: number,
  supabaseAccessToken?: string
) {
  if (fromCategoryId === toCategoryId) {
    throw new Error('Please choose a different destination category.');
  }

  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const targetCat = await client
      .from('categories')
      .select('id')
      .eq('id', toCategoryId)
      .maybeSingle();
    if (!targetCat.data) {
      throw new Error('Destination category does not exist.');
    }
    const upd = await client
      .from('products')
      .update({
        category_id: toCategoryId,
        updated_at: new Date().toISOString(),
      })
      .eq('category_id', fromCategoryId);
    if (upd.error) {
      throwHelpfulSupabaseWriteError(upd.error, 'Unable to reassign products.');
    }
    return;
  }

  try {
    const targetCat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, toCategoryId))
      .limit(1);

    if (!targetCat[0]) {
      throw new Error('Destination category does not exist.');
    }

    await db
      .update(products)
      .set({
        categoryId: toCategoryId,
        updatedAt: new Date(),
      })
      .where(eq(products.categoryId, fromCategoryId));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Destination category')) {
      throw error;
    }
    console.error('Database error in reassignCategoryProductsRecord:', error);
    throw new Error('Unable to reassign products to the selected category.', { cause: error });
  }
}

export async function deleteCategoryRecord(id: number, supabaseAccessToken?: string) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const { count } = await client
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);

    if ((count ?? 0) > 0) {
      throw new Error(
        `Cannot delete this category while ${count} product(s) are assigned to it. Reassign those products to another category first.`
      );
    }

    const del = await client.from('categories').delete().eq('id', id);
    if (del.error) {
      throwHelpfulSupabaseWriteError(del.error, 'Unable to delete category.');
    }
    return;
  }

  try {
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.categoryId, id));

    const attachedCount = countRows[0]?.count ?? 0;
    if (attachedCount > 0) {
      throw new Error(
        `Cannot delete this category while ${attachedCount} product(s) are assigned to it. Reassign those products to another category first.`
      );
    }

    await db.delete(categories).where(eq(categories.id, id));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot delete this category')) {
      throw error;
    }
    console.error('Database error in deleteCategoryRecord:', error);
    throw new Error('Unable to delete category.', { cause: error });
  }
}

function extractInternalMediaAssetIds(urls: string[]): number[] {
  const ids = new Set<number>();
  for (const url of urls) {
    const match = /^\/api\/media\/(\d+)$/.exec(url.trim());
    if (match) {
      const id = Number(match[1]);
      if (Number.isInteger(id) && id > 0) {
        ids.add(id);
      }
    }
  }
  return Array.from(ids);
}

export async function cleanupUnusedMediaAssets(
  candidateUrls: string[],
  supabaseAccessToken?: string
) {
  await deleteImagesFromSupabaseStorage(candidateUrls, supabaseAccessToken);

  if (!hasPostgresConfig()) return;

  const candidateIds = extractInternalMediaAssetIds(candidateUrls);
  if (candidateIds.length === 0) return;

  try {
    const allProductUrls = await db
      .select({ imageUrls: products.imageUrls })
      .from(products);

    const referencedIds = new Set<number>();
    for (const row of allProductUrls) {
      if (Array.isArray(row.imageUrls)) {
        for (const id of extractInternalMediaAssetIds(row.imageUrls)) {
          referencedIds.add(id);
        }
      }
    }

    for (const id of candidateIds) {
      if (!referencedIds.has(id)) {
        await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
      }
    }
  } catch (error) {
    console.error('Non-fatal media cleanup warning:', error);
  }
}

export async function deleteMediaAssetByIdIfUnused(id: number) {
  if (!hasPostgresConfig() || id <= 0) return;
  await cleanupUnusedMediaAssets([`/api/media/${id}`]);
}

export interface ProductUpsertPayload {
  title: string;
  slug?: string;
  description: string;
  priceInr: number;
  sku?: string | null;
  categoryId: number;
  imageUrls: string[];
  finish?: string | null;
  sizes?: string[];
  isPublished: boolean;
  isFeatured: boolean;
  availabilityStatus: string;
}

export async function createProductRecord(
  payload: ProductUpsertPayload,
  supabaseAccessToken?: string
) {
  const cleanTitle = payload.title.trim();
  const baseSlug = slugifyText(payload.slug || cleanTitle);
  if (!baseSlug || cleanTitle.length < 2) {
    throw new Error('A valid product title is required.');
  }

  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const catRes = await client
      .from('categories')
      .select('*')
      .eq('id', payload.categoryId)
      .maybeSingle();

    if (catRes.error) {
      throwHelpfulSupabaseWriteError(catRes.error, 'Unable to read selected category.');
    }
    if (!catRes.data) {
      throw new Error('Selected category was not found.');
    }

    const existingSlug = await client
      .from('products')
      .select('id')
      .eq('slug', baseSlug)
      .maybeSingle();

    const finalSlug = existingSlug.data
      ? `${baseSlug}-${Date.now().toString(36).slice(-5)}`
      : baseSlug;

    if (payload.isFeatured && payload.isPublished) {
      await client.from('products').update({ is_featured: false }).eq('is_featured', true);
    }

    const inserted = await client
      .from('products')
      .insert({
        category_id: payload.categoryId,
        title: cleanTitle,
        slug: finalSlug,
        description: payload.description.trim(),
        price_inr: Math.max(0, Math.round(payload.priceInr)),
        sku: payload.sku?.trim() || null,
        image_urls: payload.imageUrls,
        finish: payload.finish?.trim() || null,
        sizes: payload.sizes ?? [],
        is_published: payload.isPublished,
        is_featured: payload.isPublished ? payload.isFeatured : false,
        availability_status: payload.availabilityStatus,
      })
      .select('*')
      .single();

    if (inserted.error || !inserted.data) {
      throwHelpfulSupabaseWriteError(inserted.error, 'Unable to create jewellery product.');
    }

    const catMap = new Map<number, { id: number; name: string; slug: string }>([
      [
        Number(catRes.data.id),
        {
          id: Number(catRes.data.id),
          name: String(catRes.data.name),
          slug: String(catRes.data.slug),
        },
      ],
    ]);

    return mapSupabaseProductRow(inserted.data as Record<string, unknown>, catMap);
  }

  try {
    const catCheck = await db
      .select()
      .from(categories)
      .where(eq(categories.id, payload.categoryId))
      .limit(1);

    if (!catCheck[0]) {
      throw new Error('Selected category was not found.');
    }

    const existingSlug = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, baseSlug))
      .limit(1);

    const finalSlug =
      existingSlug.length > 0 ? `${baseSlug}-${Date.now().toString(36).slice(-5)}` : baseSlug;

    if (payload.isFeatured && payload.isPublished) {
      await db.update(products).set({ isFeatured: false });
    }

    const inserted = await db
      .insert(products)
      .values({
        title: cleanTitle,
        name: cleanTitle,
        slug: finalSlug,
        description: payload.description.trim(),
        priceInr: Math.max(0, Math.round(payload.priceInr)),
        sku: payload.sku?.trim() || null,
        categoryId: payload.categoryId,
        imageUrls: payload.imageUrls,
        finish: payload.finish?.trim() || null,
        sizes: payload.sizes ?? [],
        isPublished: payload.isPublished,
        isActive: payload.isPublished,
        isFeatured: payload.isPublished ? payload.isFeatured : false,
        availabilityStatus: payload.availabilityStatus,
      })
      .returning();

    const row = inserted[0];
    const cat = catCheck[0];

    // Mirror cloud-friendly image URLs & product metadata to Supabase
    const cloudSafeImages = (row.imageUrls ?? []).filter((u) => !u.startsWith('/api/media/'));
    if (cloudSafeImages.length > 0 || (row.imageUrls ?? []).length === 0) {
      void syncProductToSupabase(
        {
          categoryName: cat.name,
          categorySlug: cat.slug,
          title: row.title || row.name,
          slug: row.slug,
          description: row.description,
          priceInr: row.priceInr,
          sku: row.sku,
          imageUrls: cloudSafeImages.length > 0 ? cloudSafeImages : row.imageUrls,
          finish: row.finish,
          sizes: row.sizes ?? [],
          isFeatured: row.isFeatured,
          availabilityStatus: row.availabilityStatus,
          isPublished: Boolean(row.isPublished && row.isActive),
        },
        supabaseAccessToken
      );
    }

    return mapProductRecord(row, cat);
  } catch (error) {
    if (error instanceof Error && error.message === 'Selected category was not found.') {
      throw error;
    }
    console.error('Database error in createProductRecord:', error);
    throw new Error('Unable to create jewellery product.', { cause: error });
  }
}

export async function updateProductRecord(
  id: number,
  payload: ProductUpsertPayload,
  supabaseAccessToken?: string
) {
  const cleanTitle = payload.title.trim();
  const desiredSlug = slugifyText(payload.slug || cleanTitle);
  if (!desiredSlug || cleanTitle.length < 2) {
    throw new Error('A valid product title is required.');
  }

  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const existingRes = await client
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (existingRes.error) {
      throwHelpfulSupabaseWriteError(existingRes.error, 'Unable to load product.');
    }
    if (!existingRes.data) {
      throw new Error('Product not found.');
    }

    const catRes = await client
      .from('categories')
      .select('*')
      .eq('id', payload.categoryId)
      .maybeSingle();
    if (!catRes.data) {
      throw new Error('Selected category was not found.');
    }

    const conflictRes = await client
      .from('products')
      .select('id')
      .eq('slug', desiredSlug)
      .neq('id', id)
      .maybeSingle();

    const finalSlug = conflictRes.data
      ? `${desiredSlug}-${Date.now().toString(36).slice(-5)}`
      : desiredSlug;

    if (payload.isFeatured && payload.isPublished) {
      await client
        .from('products')
        .update({ is_featured: false })
        .eq('is_featured', true)
        .neq('id', id);
    }

    const prevUrls = Array.isArray(existingRes.data.image_urls)
      ? (existingRes.data.image_urls as string[])
      : [];

    const updatedRes = await client
      .from('products')
      .update({
        category_id: payload.categoryId,
        title: cleanTitle,
        slug: finalSlug,
        description: payload.description.trim(),
        price_inr: Math.max(0, Math.round(payload.priceInr)),
        sku: payload.sku?.trim() || null,
        image_urls: payload.imageUrls,
        finish: payload.finish?.trim() || null,
        sizes: payload.sizes ?? [],
        is_published: payload.isPublished,
        is_featured: payload.isPublished ? payload.isFeatured : false,
        availability_status: payload.availabilityStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updatedRes.error || !updatedRes.data) {
      throwHelpfulSupabaseWriteError(updatedRes.error, 'Unable to update jewellery product.');
    }

    const removedUrls = prevUrls.filter((u) => !payload.imageUrls.includes(u));
    if (removedUrls.length > 0) {
      await cleanupUnusedMediaAssets(removedUrls, supabaseAccessToken);
    }

    const catMap = new Map<number, { id: number; name: string; slug: string }>([
      [
        Number(catRes.data.id),
        {
          id: Number(catRes.data.id),
          name: String(catRes.data.name),
          slug: String(catRes.data.slug),
        },
      ],
    ]);

    return mapSupabaseProductRow(updatedRes.data as Record<string, unknown>, catMap);
  }

  try {
    const existingRows = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    const existingProduct = existingRows[0];
    if (!existingProduct) {
      throw new Error('Product not found.');
    }

    const catCheck = await db
      .select()
      .from(categories)
      .where(eq(categories.id, payload.categoryId))
      .limit(1);

    if (!catCheck[0]) {
      throw new Error('Selected category was not found.');
    }

    const conflicting = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, desiredSlug));

    const hasConflict = conflicting.some((row) => row.id !== id);
    const finalSlug = hasConflict
      ? `${desiredSlug}-${Date.now().toString(36).slice(-5)}`
      : desiredSlug;

    if (payload.isFeatured && payload.isPublished) {
      await db.update(products).set({ isFeatured: false }).where(ne(products.id, id));
    }

    const previousUrls = Array.isArray(existingProduct.imageUrls)
      ? existingProduct.imageUrls
      : [];

    const updated = await db
      .update(products)
      .set({
        title: cleanTitle,
        name: cleanTitle,
        slug: finalSlug,
        description: payload.description.trim(),
        priceInr: Math.max(0, Math.round(payload.priceInr)),
        sku: payload.sku?.trim() || null,
        categoryId: payload.categoryId,
        imageUrls: payload.imageUrls,
        finish: payload.finish?.trim() || null,
        sizes: payload.sizes ?? [],
        isPublished: payload.isPublished,
        isActive: payload.isPublished,
        isFeatured: payload.isPublished ? payload.isFeatured : false,
        availabilityStatus: payload.availabilityStatus,
        updatedAt: new Date(),
      })
      .where(eq(products.id, id))
      .returning();

    const removedUrls = previousUrls.filter((u) => !payload.imageUrls.includes(u));
    if (removedUrls.length > 0) {
      await cleanupUnusedMediaAssets(removedUrls, supabaseAccessToken);
    }

    const row = updated[0];
    const cat = catCheck[0];

    void syncProductToSupabase(
      {
        categoryName: cat.name,
        categorySlug: cat.slug,
        title: row.title || row.name,
        slug: row.slug,
        description: row.description,
        priceInr: row.priceInr,
        sku: row.sku,
        imageUrls: row.imageUrls ?? [],
        finish: row.finish,
        sizes: row.sizes ?? [],
        isFeatured: row.isFeatured,
        availabilityStatus: row.availabilityStatus,
        isPublished: Boolean(row.isPublished && row.isActive),
      },
      supabaseAccessToken
    );

    return mapProductRecord(row, cat);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'Product not found.' ||
        error.message === 'Selected category was not found.')
    ) {
      throw error;
    }
    console.error('Database error in updateProductRecord:', error);
    throw new Error('Unable to update jewellery product.', { cause: error });
  }
}

export async function deleteProductRecord(id: number, supabaseAccessToken?: string) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const existingRes = await client
      .from('products')
      .select('id, image_urls')
      .eq('id', id)
      .maybeSingle();

    if (!existingRes.data) {
      throw new Error('Product not found.');
    }

    const urlsToClean = Array.isArray(existingRes.data.image_urls)
      ? (existingRes.data.image_urls as string[])
      : [];

    const del = await client.from('products').delete().eq('id', id);
    if (del.error) {
      throwHelpfulSupabaseWriteError(del.error, 'Unable to delete jewellery product.');
    }

    if (urlsToClean.length > 0) {
      await cleanupUnusedMediaAssets(urlsToClean, supabaseAccessToken);
    }
    return;
  }

  try {
    const existingRows = await db
      .select({ id: products.id, slug: products.slug, imageUrls: products.imageUrls })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existingRows[0]) {
      throw new Error('Product not found.');
    }

    const urlsToClean = Array.isArray(existingRows[0].imageUrls)
      ? existingRows[0].imageUrls
      : [];
    const deletedSlug = existingRows[0].slug;

    await db.delete(products).where(eq(products.id, id));

    void deleteProductFromSupabaseBySlug(deletedSlug, supabaseAccessToken);

    if (urlsToClean.length > 0) {
      await cleanupUnusedMediaAssets(urlsToClean, supabaseAccessToken);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Product not found.') {
      throw error;
    }
    console.error('Database error in deleteProductRecord:', error);
    throw new Error('Unable to delete jewellery product.', { cause: error });
  }
}

export async function createMediaAssetRecord(params: {
  filename: string;
  mimeType: string;
  dataBase64: string;
  sizeBytes: number;
}) {
  if (!hasPostgresConfig()) {
    throw new Error('PostgreSQL binary storage is not configured in this environment.');
  }

  try {
    await ensurePostgresSchemaInitialized();
    const inserted = await db
      .insert(mediaAssets)
      .values({
        filename: params.filename,
        mimeType: params.mimeType,
        dataBase64: params.dataBase64,
        sizeBytes: params.sizeBytes,
      })
      .returning({ id: mediaAssets.id });

    return inserted[0];
  } catch (error) {
    console.error('Database error in createMediaAssetRecord:', error);
    throw new Error('Unable to store uploaded image.', { cause: error });
  }
}

export async function getMediaAssetRecord(id: number) {
  if (!hasPostgresConfig()) return null;

  try {
    await ensurePostgresSchemaInitialized();
    const rows = await db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database error in getMediaAssetRecord:', error);
    throw new Error('Unable to retrieve image asset.', { cause: error });
  }
}

export async function createEnquiryRecord(
  params: {
    userUid?: string | null;
    supabaseUserId?: string | null;
    productId?: number | null;
    productName: string;
    productPriceInr?: number | null;
    productSku?: string | null;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    preferredSize?: string | null;
    notes?: string | null;
  },
  supabaseAccessToken?: string
) {
  if (!hasPostgresConfig()) {
    const now = new Date();
    const syntheticId = Date.now() * 10 + Math.floor(Math.random() * 10);
    const sbResult = await syncOrderToSupabase(
      {
        localEnquiryId: syntheticId,
        userUid: params.userUid || null,
        supabaseUserId: params.supabaseUserId || null,
        productId: params.productId ?? null,
        productName: params.productName.trim(),
        productPriceInr: params.productPriceInr ?? null,
        productSku: params.productSku?.trim() || null,
        customerName: params.customerName.trim(),
        customerPhone: params.customerPhone.trim(),
        customerEmail: params.customerEmail.trim(),
        preferredSize: params.preferredSize?.trim() || null,
        notes: params.notes?.trim() || null,
        status: 'new',
        createdAt: now.toISOString(),
      },
      supabaseAccessToken
    );

    return {
      id: sbResult.orderId ?? syntheticId,
      userUid: params.userUid || null,
      productId: params.productId ?? null,
      productName: params.productName.trim(),
      productPriceInr: params.productPriceInr ?? null,
      productSku: params.productSku?.trim() || null,
      customerName: params.customerName.trim(),
      customerPhone: params.customerPhone.trim(),
      customerEmail: params.customerEmail.trim(),
      preferredSize: params.preferredSize?.trim() || null,
      notes: params.notes?.trim() || null,
      status: 'new',
      supabaseSynced: sbResult.synced,
      createdAt: now,
    };
  }

  try {
    await ensurePostgresSchemaInitialized();
    if (params.userUid) {
      await db
        .update(users)
        .set({
          fullName: params.customerName.trim(),
          phone: params.customerPhone.trim(),
          updatedAt: new Date(),
        })
        .where(eq(users.uid, params.userUid));
    }

    const inserted = await db
      .insert(enquiries)
      .values({
        userUid: params.userUid || null,
        productId: params.productId ?? null,
        productName: params.productName.trim(),
        productPriceInr: params.productPriceInr ?? null,
        productSku: params.productSku?.trim() || null,
        customerName: params.customerName.trim(),
        customerPhone: params.customerPhone.trim(),
        customerEmail: params.customerEmail.trim(),
        preferredSize: params.preferredSize?.trim() || null,
        notes: params.notes?.trim() || null,
        status: 'new',
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database error in createEnquiryRecord:', error);
    throw new Error('Unable to record your enquiry.', { cause: error });
  }
}

export async function getCustomerEnquiries(
  userUid: string,
  supabaseAccessToken?: string
) {
  if (!hasPostgresConfig()) {
    try {
      const client = createPrivilegedSupabaseClient(supabaseAccessToken);
      const { data, error } = await client
        .from('enquiries')
        .select('*')
        .or(`user_uid.eq.${userUid},auth_user_id.eq.${userUid}`)
        .order('created_at', { ascending: false });

      if (error || !Array.isArray(data)) return [];
      return data.map((e) => ({
        id: Number(e.id),
        product_id: e.product_id !== null && e.product_id !== undefined ? Number(e.product_id) : null,
        product_name: String(e.product_name || 'Direct Boutique Enquiry'),
        product_price_inr:
          e.product_price_inr !== null && e.product_price_inr !== undefined
            ? Number(e.product_price_inr)
            : null,
        product_sku: typeof e.product_sku === 'string' ? e.product_sku : null,
        customer_name: String(e.customer_name || ''),
        customer_phone: String(e.customer_phone || ''),
        customer_email: String(e.customer_email || ''),
        preferred_size: typeof e.preferred_size === 'string' ? e.preferred_size : null,
        notes: typeof e.notes === 'string' ? e.notes : null,
        status: String(e.status || 'new'),
        created_at: String(e.created_at || new Date().toISOString()),
      }));
    } catch {
      return [];
    }
  }

  try {
    const rows = await db
      .select()
      .from(enquiries)
      .where(eq(enquiries.userUid, userUid))
      .orderBy(desc(enquiries.createdAt));

    return rows.map((e) => ({
      id: e.id,
      product_id: e.productId,
      product_name: e.productName,
      product_price_inr: e.productPriceInr,
      product_sku: e.productSku,
      customer_name: e.customerName,
      customer_phone: e.customerPhone,
      customer_email: e.customerEmail,
      preferred_size: e.preferredSize,
      notes: e.notes,
      status: e.status,
      created_at: e.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Database error in getCustomerEnquiries:', error);
    throw new Error('Unable to load your enquiries.', { cause: error });
  }
}

export async function updateEnquiryStatusRecord(
  id: number,
  status: string,
  supabaseAccessToken?: string
) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const [enqUpd] = await Promise.all([
      client
        .from('enquiries')
        .update({ status })
        .eq('id', id)
        .select('*')
        .maybeSingle(),
      client.from('orders').update({ status }).eq('id', id),
    ]);

    if (enqUpd.error) {
      throwHelpfulSupabaseWriteError(enqUpd.error, 'Unable to update enquiry status.');
    }
    return enqUpd.data ?? null;
  }

  try {
    const updated = await db
      .update(enquiries)
      .set({ status })
      .where(eq(enquiries.id, id))
      .returning();

    if (updated[0]) {
      const client = createPrivilegedSupabaseClient(supabaseAccessToken);
      void Promise.allSettled([
        client.from('enquiries').update({ status }).eq('local_enquiry_id', id),
        client.from('orders').update({ status }).eq('local_enquiry_id', id),
      ]);
    }

    return updated[0] ?? null;
  } catch (error) {
    console.error('Database error in updateEnquiryStatusRecord:', error);
    throw new Error('Unable to update enquiry status.', { cause: error });
  }
}

export async function markEnquirySyncedToSupabase(id: number) {
  if (!hasPostgresConfig()) return;
  try {
    await db
      .update(enquiries)
      .set({ supabaseSynced: true })
      .where(eq(enquiries.id, id));
  } catch (error) {
    console.warn('Non-fatal markEnquirySyncedToSupabase warning:', error);
  }
}

export async function getUnsyncedEnquiries() {
  if (!hasPostgresConfig()) return [];
  try {
    return await db
      .select()
      .from(enquiries)
      .where(eq(enquiries.supabaseSynced, false))
      .orderBy(enquiries.id);
  } catch (error) {
    console.error('Database error in getUnsyncedEnquiries:', error);
    return [];
  }
}

export async function getAllUsersForSync() {
  if (!hasPostgresConfig()) return [];
  try {
    return await db.select().from(users).orderBy(users.createdAt);
  } catch (error) {
    console.error('Database error in getAllUsersForSync:', error);
    return [];
  }
}

export async function getAllCatalogueForSupabaseSync() {
  if (!hasPostgresConfig()) return { categories: [], products: [] };
  try {
    await ensureInitialCategoriesSeeded();
    const categoryRows = await db.select().from(categories).orderBy(categories.id);
    const productRows = await db
      .select({
        product: products,
        category: categories,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .orderBy(products.id);

    return {
      categories: categoryRows,
      products: productRows,
    };
  } catch {
    return { categories: [], products: [] };
  }
}
