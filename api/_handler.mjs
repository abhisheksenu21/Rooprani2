// Auto-generated Vercel Serverless API bundle from src/server/app.ts
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/app.ts
import express from "express";

// src/db/index.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  categories: () => categories,
  categoriesRelations: () => categoriesRelations,
  enquiries: () => enquiries,
  enquiriesRelations: () => enquiriesRelations,
  mediaAssets: () => mediaAssets,
  products: () => products,
  productsRelations: () => productsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp
} from "drizzle-orm/pg-core";
var users = pgTable("users", {
  uid: text("uid").primaryKey(),
  // Auth UID (Supabase / Server / Firebase)
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  supabaseUserId: text("supabase_user_id"),
  fullName: text("full_name"),
  phone: text("phone"),
  role: text("role").notNull().default("customer"),
  // 'customer' | 'admin'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id").references(() => categories.id).notNull(),
    title: text("title").notNull().default(""),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull(),
    priceInr: integer("price_inr").notNull(),
    sku: text("sku"),
    imageUrls: jsonb("image_urls").$type().notNull().default([]),
    finish: text("finish"),
    sizes: jsonb("sizes").$type().notNull().default([]),
    availabilityStatus: text("availability_status").notNull().default("available"),
    isPublished: boolean("is_published").notNull().default(true),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => [
    index("products_category_id_idx").on(table.categoryId),
    index("products_is_published_idx").on(table.isPublished),
    index("products_availability_status_idx").on(table.availabilityStatus)
  ]
);
var enquiries = pgTable("enquiries", {
  id: serial("id").primaryKey(),
  userUid: text("user_uid").references(() => users.uid),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  productName: text("product_name").notNull(),
  productPriceInr: integer("product_price_inr"),
  productSku: text("product_sku"),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email").notNull(),
  preferredSize: text("preferred_size"),
  notes: text("notes"),
  status: text("status").notNull().default("new"),
  // 'new' | 'contacted' | 'completed'
  supabaseSynced: boolean("supabase_synced").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var mediaAssets = pgTable("media_assets", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  dataBase64: text("data_base64").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products)
}));
var productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id]
  }),
  enquiries: many(enquiries)
}));
var usersRelations = relations(users, ({ many }) => ({
  enquiries: many(enquiries)
}));
var enquiriesRelations = relations(enquiries, ({ one }) => ({
  user: one(users, {
    fields: [enquiries.userUid],
    references: [users.uid]
  }),
  product: one(products, {
    fields: [enquiries.productId],
    references: [products.id]
  })
}));

// src/db/index.ts
function getTrimmedEnv(key) {
  const val = process.env[key];
  return typeof val === "string" ? val.trim() : "";
}
function resolvePostgresConnectionSource() {
  const dbUrl = getTrimmedEnv("DATABASE_URL");
  if (dbUrl) return { source: "DATABASE_URL", connectionString: dbUrl };
  const pgUrl = getTrimmedEnv("POSTGRES_URL");
  if (pgUrl) return { source: "POSTGRES_URL", connectionString: pgUrl };
  const sbDbUrl = getTrimmedEnv("SUPABASE_DB_URL");
  if (sbDbUrl) return { source: "SUPABASE_DB_URL", connectionString: sbDbUrl };
  const nonPoolingUrl = getTrimmedEnv("POSTGRES_URL_NON_POOLING");
  if (nonPoolingUrl) {
    return { source: "POSTGRES_URL_NON_POOLING", connectionString: nonPoolingUrl };
  }
  const sqlHost = getTrimmedEnv("SQL_HOST");
  const sqlUser = getTrimmedEnv("SQL_USER");
  const sqlDbName = getTrimmedEnv("SQL_DB_NAME");
  if (sqlHost && sqlUser && sqlDbName) {
    return { source: "CLOUD_SQL" };
  }
  return { source: "NONE" };
}
function hasPostgresConfig() {
  return resolvePostgresConnectionSource().source !== "NONE";
}
function shouldEnableSslForUrl(connectionString) {
  if (getTrimmedEnv("SQL_SSL") === "false") return false;
  if (getTrimmedEnv("SQL_SSL") === "true") return true;
  const lower = connectionString.toLowerCase();
  if (lower.includes("localhost") || lower.includes("127.0.0.1") || lower.includes("sslmode=disable")) {
    return false;
  }
  return true;
}
var createPool = () => {
  if (!global._postgresPool) {
    const resolved = resolvePostgresConnectionSource();
    if (resolved.source === "NONE") {
      throw new Error(
        "PostgreSQL is not configured in this environment. Set DATABASE_URL, POSTGRES_URL, or use Supabase Cloud mode."
      );
    }
    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    let config;
    if (resolved.connectionString) {
      config = {
        connectionString: resolved.connectionString,
        ssl: shouldEnableSslForUrl(resolved.connectionString) ? { rejectUnauthorized: false } : void 0,
        max: isServerless ? 3 : 10,
        idleTimeoutMillis: isServerless ? 1e4 : 3e4,
        connectionTimeoutMillis: 1e4,
        allowExitOnIdle: isServerless
      };
    } else {
      config = {
        host: getTrimmedEnv("SQL_HOST"),
        port: Number(getTrimmedEnv("SQL_PORT")) || 5432,
        user: getTrimmedEnv("SQL_USER"),
        password: process.env.SQL_PASSWORD || "",
        database: getTrimmedEnv("SQL_DB_NAME"),
        ssl: getTrimmedEnv("SQL_SSL") === "true" ? { rejectUnauthorized: false } : void 0,
        max: isServerless ? 3 : 10,
        idleTimeoutMillis: isServerless ? 1e4 : 3e4,
        connectionTimeoutMillis: 12e3,
        allowExitOnIdle: isServerless
      };
    }
    global._postgresPool = new Pool(config);
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};
function getDb() {
  if (!global._drizzleDb) {
    global._drizzleDb = drizzle(createPool(), { schema: schema_exports });
  }
  return global._drizzleDb;
}
var db = new Proxy({}, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  }
});
async function ensurePostgresSchemaInitialized() {
  if (!hasPostgresConfig()) return;
  const resolved = resolvePostgresConnectionSource();
  if (resolved.source === "CLOUD_SQL") return;
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
      global._postgresSchemaInitPromise = void 0;
      console.error("Error bootstrapping PostgreSQL schema:", err);
    });
  }
  await global._postgresSchemaInitPromise;
}
async function checkPostgresHealth() {
  const resolved = resolvePostgresConnectionSource();
  if (resolved.source === "NONE") {
    return { configured: false, source: "NONE", connected: false };
  }
  try {
    const pool = createPool();
    await pool.query("SELECT 1");
    return { configured: true, source: resolved.source, connected: true };
  } catch {
    return { configured: true, source: resolved.source, connected: false };
  }
}

// src/db/repository.ts
import crypto3 from "node:crypto";
import { and, desc, eq, ne, notInArray, sql } from "drizzle-orm";

// src/lib/security.ts
import crypto from "node:crypto";
var SESSION_PREFIX = "rpr_v1.";
var SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1e3;
function isSessionSecretConfigured() {
  return Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16);
}
function getServerSigningSecret() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }
  const envSeed = [
    process.env.DATABASE_URL || "",
    process.env.POSTGRES_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    process.env.SQL_PASSWORD || "",
    process.env.SQL_HOST || "",
    process.env.SQL_DB_NAME || "",
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://gszzzhfzysxtjncmbkjc.supabase.co",
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_VWVwWVIi7WrHY6TOs_DSaA_vKpUMinh"
  ].join(":");
  return crypto.createHash("sha256").update(`rooprani-auth-hmac-v2:${envSeed}`).digest("hex");
}
function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}
function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const actualBuf = crypto.scryptSync(plainPassword, salt, 64);
    const expectedBuf = Buffer.from(expectedHex, "hex");
    if (actualBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actualBuf, expectedBuf);
  } catch {
    return false;
  }
}
function createSignedSessionToken(params) {
  const now = Date.now();
  const payload = {
    uid: params.uid,
    email: params.email.toLowerCase().trim(),
    role: params.role,
    fullName: params.fullName ?? null,
    phone: params.phone ?? null,
    supabaseUserId: params.supabaseUserId ?? null,
    iat: now,
    exp: now + SESSION_TTL_MS
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sigB64 = crypto.createHmac("sha256", getServerSigningSecret()).update(payloadB64).digest("base64url");
  return `${SESSION_PREFIX}${payloadB64}.${sigB64}`;
}
function verifySignedSessionToken(token) {
  if (!token || !token.startsWith(SESSION_PREFIX)) return null;
  const raw = token.slice(SESSION_PREFIX.length);
  const dotIndex = raw.indexOf(".");
  if (dotIndex <= 0) return null;
  const payloadB64 = raw.slice(0, dotIndex);
  const sigB64 = raw.slice(dotIndex + 1);
  if (!payloadB64 || !sigB64) return null;
  const expectedSigB64 = crypto.createHmac("sha256", getServerSigningSecret()).update(payloadB64).digest("base64url");
  try {
    const actualBuf = Buffer.from(sigB64, "utf8");
    const expectedBuf = Buffer.from(expectedSigB64, "utf8");
    if (actualBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(actualBuf, expectedBuf)) return null;
    const decoded = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );
    if (!decoded.uid || !decoded.email || typeof decoded.exp !== "number") {
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

// src/lib/supabase-server.ts
import crypto2 from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

// src/db/supabaseMigrationSql.ts
var SUPABASE_MIGRATION_SQL = `-- =============================================================================
-- ROOPRANI JEWELLERY \u2014 SUPABASE BACKEND SCHEMA, ORDERS, LOGINS & RLS POLICIES
-- Project ID: gszzzhfzysxtjncmbkjc (https://gszzzhfzysxtjncmbkjc.supabase.co)
-- =============================================================================
-- Run this complete script once in your Supabase Dashboard -> SQL Editor:
-- https://supabase.com/dashboard/project/gszzzhfzysxtjncmbkjc/sql/new

-- 1. Customer & Administrator Profiles Table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper function to verify administrator role without RLS recursion
CREATE OR REPLACE FUNCTION public.is_rooprani_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
  OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN (
    'roopranijwellery@gmail.com',
    'roopranijewellery@gmail.com'
  );
$$;

-- Trigger to automatically populate public.profiles whenever someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),
    CASE
      WHEN LOWER(NEW.email) IN ('roopranijwellery@gmail.com', 'roopranijewellery@gmail.com')
      THEN 'admin'
      ELSE 'customer'
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
    role = CASE
      WHEN LOWER(EXCLUDED.email) IN ('roopranijwellery@gmail.com', 'roopranijewellery@gmail.com')
      THEN 'admin'
      ELSE public.profiles.role
    END,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Auto-confirm admin & customer accounts so logins work immediately on Vercel without SMTP setup
CREATE OR REPLACE FUNCTION public.auto_confirm_rooprani_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_auto_confirm ON auth.users;
  CREATE TRIGGER on_auth_user_auto_confirm
    BEFORE INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_rooprani_auth_user();

  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
  WHERE email_confirmed_at IS NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipped optional auth.users auto-confirmation: %', SQLERRM;
END $$;

-- Backfill any existing auth.users into public.profiles
INSERT INTO public.profiles (id, email, full_name, phone, role)
SELECT
  u.id,
  LOWER(u.email),
  NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'full_name', '')), ''),
  NULLIF(TRIM(COALESCE(u.raw_user_meta_data->>'phone', '')), ''),
  CASE
    WHEN LOWER(u.email) IN ('roopranijwellery@gmail.com', 'roopranijewellery@gmail.com')
    THEN 'admin'
    ELSE 'customer'
  END
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  role = CASE
    WHEN LOWER(EXCLUDED.email) IN ('roopranijwellery@gmail.com', 'roopranijewellery@gmail.com')
    THEN 'admin'
    ELSE public.profiles.role
  END,
  updated_at = NOW();

-- 2. User Login Activity Table (records every customer & admin login)
CREATE TABLE IF NOT EXISTS public.user_logins (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_uid TEXT NOT NULL,
  email TEXT NOT NULL CHECK (position('@' in email) > 1),
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  auth_provider TEXT NOT NULL DEFAULT 'email',
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_logins_email_idx ON public.user_logins (email);
CREATE INDEX IF NOT EXISTS user_logins_logged_in_at_idx ON public.user_logins (logged_in_at DESC);

-- 3. Customer Orders Table (records every jewellery order / buy request)
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  local_enquiry_id BIGINT UNIQUE,
  user_uid TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id BIGINT,
  product_title TEXT NOT NULL,
  product_price_inr INTEGER CHECK (product_price_inr IS NULL OR product_price_inr >= 0),
  product_sku TEXT,
  customer_name TEXT NOT NULL CHECK (char_length(trim(customer_name)) >= 2),
  customer_phone TEXT NOT NULL CHECK (char_length(trim(customer_phone)) >= 8),
  customer_email TEXT NOT NULL CHECK (position('@' in customer_email) > 1),
  preferred_size TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_email_idx ON public.orders (customer_email);

-- 4. Customer Enquiries Table (WhatsApp catalogue enquiry mirror)
CREATE TABLE IF NOT EXISTS public.enquiries (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  local_enquiry_id BIGINT UNIQUE,
  user_uid TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id BIGINT,
  product_name TEXT NOT NULL,
  product_price_inr INTEGER CHECK (product_price_inr IS NULL OR product_price_inr >= 0),
  product_sku TEXT,
  customer_name TEXT NOT NULL CHECK (char_length(trim(customer_name)) >= 2),
  customer_phone TEXT NOT NULL CHECK (char_length(trim(customer_phone)) >= 8),
  customer_email TEXT NOT NULL CHECK (position('@' in customer_email) > 1),
  preferred_size TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS enquiries_created_at_idx ON public.enquiries (created_at DESC);

-- 5. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.categories (name, slug)
VALUES
  ('Bangles', 'bangles'),
  ('Kade', 'kade'),
  ('Earrings', 'earrings'),
  ('Necklaces', 'necklaces'),
  ('Bentex Jewellery', 'bentex-jewellery'),
  ('Accessories', 'accessories')
ON CONFLICT (slug) DO NOTHING;

-- 6. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 3),
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  price_inr INTEGER NOT NULL CHECK (price_inr >= 0),
  sku TEXT,
  image_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  finish TEXT,
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  availability_status TEXT NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'unavailable', 'in_stock', 'limited', 'made_to_order', 'out_of_stock')),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_is_published_idx ON public.products (is_published);
CREATE INDEX IF NOT EXISTS products_availability_status_idx ON public.products (availability_status);

-- Seed initial Rooprani showcase pieces once when public.products is empty
INSERT INTO public.products (
  category_id,
  title,
  slug,
  description,
  price_inr,
  sku,
  image_urls,
  finish,
  sizes,
  is_featured,
  availability_status,
  is_published
)
SELECT
  c.id,
  seed.title,
  seed.slug,
  seed.description,
  seed.price_inr,
  seed.sku,
  seed.image_urls,
  seed.finish,
  seed.sizes,
  seed.is_featured,
  seed.availability_status,
  TRUE
FROM (
  VALUES
    (
      'necklaces',
      'Rajwada Polki & Pearl Choker',
      'rajwada-polki-pearl-choker',
      'An antique champagne-gold choker set with uncut polki-style glass stones, fine granulation detailing, and luminous cream pearl drops designed to rest gracefully along the collarbone.',
      3450,
      'RR-NK-101',
      '["/catalogue/kundan-necklace.jpg"]'::jsonb,
      'Antique Champagne Gold',
      '["Adjustable Dori"]'::jsonb,
      TRUE,
      'in_stock'
    ),
    (
      'bangles',
      'Noor Filigree Chooda Set (Set of 4)',
      'noor-filigree-chooda-bangles',
      'Finely engraved artificial gold bangles featuring floral jaali relief work and beaded rims, balanced for effortless everyday layering or festive ensembles.',
      1680,
      'RR-BG-204',
      '["/catalogue/gold-bangles.jpg"]'::jsonb,
      '22K-Tone Matte Gold',
      '["2.4", "2.6", "2.8"]'::jsonb,
      FALSE,
      'in_stock'
    ),
    (
      'kade',
      'Mewar Meenakari Hinged Kade (Pair)',
      'mewar-meenakari-hinged-kade',
      'Sculpted Rajasthani hinged kade bracelets adorned with peacock relief carving and subtle deep ruby and emerald enamel accents, secured with precision screw clasps.',
      2490,
      'RR-KD-309',
      '["/catalogue/sculpted-kade.jpg"]'::jsonb,
      'Heritage Gold & Enamel',
      '["2.4", "2.6", "2.8"]'::jsonb,
      FALSE,
      'limited'
    ),
    (
      'earrings',
      'Meher Chandbali Jhumka Earrings',
      'meher-chandbali-jhumka-earrings',
      'Crescent chandbali silhouettes suspended above finely beaded jhumka bells, accented with ruby-toned cabochons and delicate pearl droplets.',
      1290,
      'RR-ER-412',
      '["/catalogue/chandbali-earrings.jpg"]'::jsonb,
      'Oxidised Champagne Gold',
      '[]'::jsonb,
      FALSE,
      'in_stock'
    ),
    (
      'bentex-jewellery',
      'Padmavati Bentex Temple Rani Haar Set',
      'padmavati-bentex-temple-rani-haar',
      'Traditional Bentex gold-toned long temple necklace crafted with stamped lotus and coin motifs, paired with matching lotus ear studs for classic bridal and festive wear.',
      2950,
      'RR-BX-501',
      '["/catalogue/bentex-haar.jpg"]'::jsonb,
      'Traditional Bentex Matte Gold',
      '["Long Haar + Matching Studs"]'::jsonb,
      FALSE,
      'in_stock'
    ),
    (
      'accessories',
      'Zari Pearl Maang Tikka & Hathphool Suite',
      'zari-pearl-maang-tikka-hathphool',
      'Delicate multi-strand pearl hathphool hand harness paired with a crescent filigree maang tikka, crafted for intimate celebrations and wedding festivities.',
      1850,
      'RR-AC-608',
      '["/catalogue/maang-tikka.jpg"]'::jsonb,
      'Champagne Gold & Pearl',
      '["Free Size Adjustable"]'::jsonb,
      FALSE,
      'made_to_order'
    )
) AS seed (
  category_slug,
  title,
  slug,
  description,
  price_inr,
  sku,
  image_urls,
  finish,
  sizes,
  is_featured,
  availability_status
)
JOIN public.categories c ON c.slug = seed.category_slug
WHERE NOT EXISTS (SELECT 1 FROM public.products LIMIT 1)
ON CONFLICT (slug) DO NOTHING;

-- 7. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_logins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_rooprani_admin());

DROP POLICY IF EXISTS "Users can update own contact fields without changing role" ON public.profiles;
CREATE POLICY "Users can update own contact fields without changing role"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "Record user login events" ON public.user_logins;
CREATE POLICY "Record user login events"
  ON public.user_logins FOR INSERT
  WITH CHECK (
    position('@' in email) > 1
    AND role IN ('customer', 'admin')
  );

DROP POLICY IF EXISTS "Admins can read user login events" ON public.user_logins;
CREATE POLICY "Admins can read user login events"
  ON public.user_logins FOR SELECT
  USING (public.is_rooprani_admin());

DROP POLICY IF EXISTS "Customers can submit orders" ON public.orders;
CREATE POLICY "Customers can submit orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    char_length(trim(customer_name)) >= 2
    AND char_length(trim(customer_phone)) >= 8
    AND position('@' in customer_email) > 1
  );

DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
CREATE POLICY "Users and admins can view orders"
  ON public.orders FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id)
    OR public.is_rooprani_admin()
  );

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_rooprani_admin())
  WITH CHECK (public.is_rooprani_admin());

DROP POLICY IF EXISTS "Customers can submit enquiries" ON public.enquiries;
CREATE POLICY "Customers can submit enquiries"
  ON public.enquiries FOR INSERT
  WITH CHECK (
    char_length(trim(customer_name)) >= 2
    AND char_length(trim(customer_phone)) >= 8
    AND position('@' in customer_email) > 1
  );

DROP POLICY IF EXISTS "Users and admins can view enquiries" ON public.enquiries;
CREATE POLICY "Users and admins can view enquiries"
  ON public.enquiries FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = auth_user_id)
    OR public.is_rooprani_admin()
  );

DROP POLICY IF EXISTS "Admins can update enquiries" ON public.enquiries;
CREATE POLICY "Admins can update enquiries"
  ON public.enquiries FOR UPDATE
  USING (public.is_rooprani_admin())
  WITH CHECK (public.is_rooprani_admin());

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
CREATE POLICY "Admins can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_rooprani_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
CREATE POLICY "Admins can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_rooprani_admin())
  WITH CHECK (public.is_rooprani_admin());

DROP POLICY IF EXISTS "Admins can delete empty categories" ON public.categories;
CREATE POLICY "Admins can delete empty categories"
  ON public.categories FOR DELETE
  USING (public.is_rooprani_admin());

DROP POLICY IF EXISTS "Public can view published available products" ON public.products;
CREATE POLICY "Public can view published available products"
  ON public.products FOR SELECT
  USING (
    (is_published = TRUE AND availability_status NOT IN ('unavailable', 'out_of_stock'))
    OR public.is_rooprani_admin()
  );

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_rooprani_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (public.is_rooprani_admin())
  WITH CHECK (public.is_rooprani_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.is_rooprani_admin());

-- 8. Persistent Product Image Storage Bucket ('product-images')
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  4194304,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public visitors can read product images" ON storage.objects;
CREATE POLICY "Public visitors can read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authorized admins can upload product images" ON storage.objects;
CREATE POLICY "Authorized admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_rooprani_admin());

DROP POLICY IF EXISTS "Authorized admins can delete product images" ON storage.objects;
CREATE POLICY "Authorized admins can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.is_rooprani_admin());
`;

// src/lib/supabase-server.ts
var DEFAULT_SUPABASE_URL = "https://gszzzhfzysxtjncmbkjc.supabase.co";
var DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_VWVwWVIi7WrHY6TOs_DSaA_vKpUMinh";
var SERVER_SUPABASE_PROJECT_ID = "gszzzhfzysxtjncmbkjc";
var SERVER_SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
var SERVER_SUPABASE_KEY = (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY).trim();
var SERVER_SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
function hasSupabaseServiceRoleKey() {
  return SERVER_SUPABASE_SERVICE_ROLE_KEY.length > 20;
}
function createServerSupabaseClient(accessToken) {
  return createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    ...accessToken ? {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    } : {}
  });
}
function createPrivilegedSupabaseClient(accessToken) {
  if (hasSupabaseServiceRoleKey()) {
    return createClient(SERVER_SUPABASE_URL, SERVER_SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  return createServerSupabaseClient(accessToken);
}
var serverSupabase = createServerSupabaseClient();
async function verifySupabaseAccessToken(token) {
  if (!token || token.startsWith("rpr_v1.")) return null;
  try {
    const { data, error } = await serverSupabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch {
    return null;
  }
}
async function syncUserLoginToSupabase(params) {
  let supabaseUserId = null;
  let supabaseAccessToken = null;
  const cleanEmail = params.email.trim().toLowerCase();
  if (params.password) {
    try {
      const signInRes = await serverSupabase.auth.signInWithPassword({
        email: cleanEmail,
        password: params.password
      });
      if (signInRes.data?.user) {
        supabaseUserId = signInRes.data.user.id;
        supabaseAccessToken = signInRes.data.session?.access_token ?? null;
      } else if (signInRes.error && /invalid login credentials/i.test(signInRes.error.message || "")) {
        const signUpRes = await serverSupabase.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              full_name: params.fullName || "",
              phone: params.phone || ""
            }
          }
        });
        if (signUpRes.data?.user) {
          supabaseUserId = signUpRes.data.user.id;
          supabaseAccessToken = signUpRes.data.session?.access_token ?? null;
        }
      }
    } catch (err) {
      console.warn("Non-fatal Supabase Auth sync warning:", err);
    }
  }
  try {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken || void 0);
    await client.from("user_logins").insert({
      user_uid: supabaseUserId || params.userUid,
      email: cleanEmail,
      full_name: params.fullName?.trim() || null,
      phone: params.phone?.trim() || null,
      role: params.role === "admin" ? "admin" : "customer",
      auth_provider: params.authProvider,
      logged_in_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch {
  }
  return { supabaseUserId, supabaseAccessToken };
}
async function syncOrderToSupabase(payload, accessToken) {
  const client = createPrivilegedSupabaseClient(accessToken);
  const isUuid = payload.supabaseUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    payload.supabaseUserId
  );
  const createdIso = payload.createdAt || (/* @__PURE__ */ new Date()).toISOString();
  try {
    const [ordersRes, enquiriesRes] = await Promise.all([
      client.from("orders").upsert(
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
          status: payload.status || "new",
          created_at: createdIso
        },
        { onConflict: "local_enquiry_id", ignoreDuplicates: false }
      ).select("id").maybeSingle(),
      client.from("enquiries").upsert(
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
          status: payload.status || "new",
          created_at: createdIso
        },
        { onConflict: "local_enquiry_id", ignoreDuplicates: false }
      )
    ]);
    if (ordersRes.error && enquiriesRes.error) {
      const [plainOrder, plainEnq] = await Promise.all([
        client.from("orders").insert({
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
          status: payload.status || "new",
          created_at: createdIso
        }).select("id").maybeSingle(),
        client.from("enquiries").insert({
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
          status: payload.status || "new",
          created_at: createdIso
        })
      ]);
      if (plainOrder.error && plainEnq.error) {
        return {
          synced: false,
          error: plainOrder.error.message || plainEnq.error.message
        };
      }
      return {
        synced: true,
        orderId: typeof plainOrder.data?.id === "number" ? plainOrder.data.id : void 0
      };
    }
    return {
      synced: true,
      orderId: typeof ordersRes.data?.id === "number" ? ordersRes.data.id : void 0
    };
  } catch (err) {
    return {
      synced: false,
      error: err instanceof Error ? err.message : "Unable to write order to Supabase."
    };
  }
}
async function uploadImageToSupabaseStorage(params) {
  try {
    const client = createPrivilegedSupabaseClient(params.accessToken);
    const ext = params.mimeType === "image/png" ? "png" : params.mimeType === "image/webp" ? "webp" : "jpg";
    const baseName = params.filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
    const objectPath = `catalogue/${Date.now()}-${crypto2.randomBytes(4).toString("hex")}-${baseName || "piece"}.${ext}`;
    const uploadRes = await client.storage.from("product-images").upload(objectPath, params.buffer, {
      contentType: params.mimeType,
      cacheControl: "31536000",
      upsert: false
    });
    if (uploadRes.error) {
      return { uploaded: false };
    }
    const { data: pubData } = client.storage.from("product-images").getPublicUrl(objectPath);
    if (!pubData?.publicUrl) {
      return { uploaded: false };
    }
    return {
      uploaded: true,
      publicUrl: pubData.publicUrl,
      objectPath
    };
  } catch {
    return { uploaded: false };
  }
}
async function deleteImagesFromSupabaseStorage(urls, accessToken) {
  const prefix = `${SERVER_SUPABASE_URL}/storage/v1/object/public/product-images/`;
  const paths = urls.map((u) => u.trim()).filter((u) => u.startsWith(prefix)).map((u) => decodeURIComponent(u.slice(prefix.length))).filter(Boolean);
  if (paths.length === 0) return;
  try {
    const client = createPrivilegedSupabaseClient(accessToken);
    await client.storage.from("product-images").remove(paths);
  } catch {
  }
}
async function syncCategoryToSupabase(category, accessToken) {
  try {
    const client = createPrivilegedSupabaseClient(accessToken);
    const res = await client.from("categories").upsert(
      {
        name: category.name,
        slug: category.slug,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      { onConflict: "slug", ignoreDuplicates: false }
    ).select("id").maybeSingle();
    if (res.data?.id) return Number(res.data.id);
    const existing = await client.from("categories").select("id").eq("slug", category.slug).maybeSingle();
    return existing.data?.id ? Number(existing.data.id) : null;
  } catch {
    return null;
  }
}
async function syncProductToSupabase(product, accessToken) {
  try {
    const sbCategoryId = await syncCategoryToSupabase(
      { name: product.categoryName, slug: product.categorySlug },
      accessToken
    );
    if (!sbCategoryId) return false;
    const client = createPrivilegedSupabaseClient(accessToken);
    const res = await client.from("products").upsert(
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
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      },
      { onConflict: "slug", ignoreDuplicates: false }
    );
    return !res.error;
  } catch {
    return false;
  }
}
async function deleteProductFromSupabaseBySlug(slug, accessToken) {
  if (!slug) return;
  try {
    const client = createPrivilegedSupabaseClient(accessToken);
    await client.from("products").delete().eq("slug", slug);
  } catch {
  }
}
function readMigrationSql() {
  try {
    const sqlPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "001_rooprani_catalogue_and_rls.sql"
    );
    if (fs.existsSync(sqlPath)) {
      const content = fs.readFileSync(sqlPath, "utf8");
      if (content.trim().length > 0) return content;
    }
  } catch {
  }
  return SUPABASE_MIGRATION_SQL;
}
async function checkTableExists(tableName) {
  try {
    const apiKey = hasSupabaseServiceRoleKey() ? SERVER_SUPABASE_SERVICE_ROLE_KEY : SERVER_SUPABASE_KEY;
    const res = await fetch(
      `${SERVER_SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`,
      {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`
        }
      }
    );
    if (res.status === 200 || res.status === 206) {
      return true;
    }
    const body = await res.text();
    if (body.includes("PGRST205") || res.status === 404) {
      return false;
    }
    return res.status === 401 || res.status === 403;
  } catch {
    return false;
  }
}
async function checkStorageBucketReady() {
  try {
    const apiKey = hasSupabaseServiceRoleKey() ? SERVER_SUPABASE_SERVICE_ROLE_KEY : SERVER_SUPABASE_KEY;
    const res = await fetch(`${SERVER_SUPABASE_URL}/storage/v1/bucket/product-images`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`
      }
    });
    if (!res.ok) return false;
    const payload = await res.json().catch(() => null);
    return payload?.id === "product-images";
  } catch {
    return false;
  }
}
async function getSupabaseDiagnostics() {
  let authReachable = false;
  try {
    const authRes = await fetch(`${SERVER_SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SERVER_SUPABASE_KEY,
        Authorization: `Bearer ${SERVER_SUPABASE_KEY}`
      }
    });
    authReachable = authRes.ok;
  } catch {
    authReachable = false;
  }
  const [
    profiles,
    user_logins,
    orders,
    enquiries2,
    categories2,
    products2,
    storageBucketReady
  ] = await Promise.all([
    checkTableExists("profiles"),
    checkTableExists("user_logins"),
    checkTableExists("orders"),
    checkTableExists("enquiries"),
    checkTableExists("categories"),
    checkTableExists("products"),
    checkStorageBucketReady()
  ]);
  const tables = {
    profiles,
    user_logins,
    orders,
    enquiries: enquiries2,
    categories: categories2,
    products: products2
  };
  const tablesReady = orders && enquiries2 && user_logins && profiles && categories2 && products2;
  return {
    projectId: SERVER_SUPABASE_PROJECT_ID,
    projectUrl: SERVER_SUPABASE_URL,
    sqlEditorUrl: `https://supabase.com/dashboard/project/${SERVER_SUPABASE_PROJECT_ID}/sql/new`,
    authReachable,
    tablesReady,
    storageBucketReady,
    serviceRoleConfigured: hasSupabaseServiceRoleKey(),
    tables,
    migrationSql: readMigrationSql()
  };
}

// src/db/repository.ts
var BOOTSTRAP_ADMIN_EMAILS = new Set(
  [
    "roopranijwellery@gmail.com",
    "roopranijewellery@gmail.com",
    "abhisheksentit@gmail.com",
    ...process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(",") : []
  ].map((e) => e.trim().toLowerCase()).filter(Boolean)
);
var ADMIN_BOOTSTRAP_SCRYPT_HASH = process.env.ADMIN_BOOTSTRAP_PASSWORD_HASH || "scrypt$0b1ea915e567a3773bcf569a6858478e$016eadf2e668cd7d8987eef60c6ee433939f93b3b9935939d7cf784532f9ff25ebfcf61d9b0786f238a57bd17eb1403b654f4220cdfc317721ad9629bf6a9c7b";
var INITIAL_CATEGORIES = [
  { id: 1, name: "Bangles", slug: "bangles" },
  { id: 2, name: "Kade", slug: "kade" },
  { id: 3, name: "Earrings", slug: "earrings" },
  { id: 4, name: "Necklaces", slug: "necklaces" },
  { id: 5, name: "Bentex Jewellery", slug: "bentex-jewellery" },
  { id: 6, name: "Accessories", slug: "accessories" }
];
var INITIAL_PRODUCTS_SEED = [
  {
    id: 1,
    category_id: 4,
    category_slug: "necklaces",
    title: "Rajwada Polki & Pearl Choker",
    slug: "rajwada-polki-pearl-choker",
    description: "An antique champagne-gold choker set with uncut polki-style glass stones, fine granulation detailing, and luminous cream pearl drops designed to rest gracefully along the collarbone.",
    price_inr: 3450,
    sku: "RR-NK-101",
    image_urls: ["/catalogue/kundan-necklace.jpg"],
    finish: "Antique Champagne Gold",
    sizes: ["Adjustable Dori"],
    is_featured: true,
    availability_status: "in_stock",
    is_published: true
  },
  {
    id: 2,
    category_id: 1,
    category_slug: "bangles",
    title: "Noor Filigree Chooda Set (Set of 4)",
    slug: "noor-filigree-chooda-bangles",
    description: "Finely engraved artificial gold bangles featuring floral jaali relief work and beaded rims, balanced for effortless everyday layering or festive ensembles.",
    price_inr: 1680,
    sku: "RR-BG-204",
    image_urls: ["/catalogue/gold-bangles.jpg"],
    finish: "22K-Tone Matte Gold",
    sizes: ["2.4", "2.6", "2.8"],
    is_featured: false,
    availability_status: "in_stock",
    is_published: true
  },
  {
    id: 3,
    category_id: 2,
    category_slug: "kade",
    title: "Mewar Meenakari Hinged Kade (Pair)",
    slug: "mewar-meenakari-hinged-kade",
    description: "Sculpted Rajasthani hinged kade bracelets adorned with peacock relief carving and subtle deep ruby and emerald enamel accents, secured with precision screw clasps.",
    price_inr: 2490,
    sku: "RR-KD-309",
    image_urls: ["/catalogue/sculpted-kade.jpg"],
    finish: "Heritage Gold & Enamel",
    sizes: ["2.4", "2.6", "2.8"],
    is_featured: false,
    availability_status: "limited",
    is_published: true
  },
  {
    id: 4,
    category_id: 3,
    category_slug: "earrings",
    title: "Meher Chandbali Jhumka Earrings",
    slug: "meher-chandbali-jhumka-earrings",
    description: "Crescent chandbali silhouettes suspended above finely beaded jhumka bells, accented with ruby-toned cabochons and delicate pearl droplets.",
    price_inr: 1290,
    sku: "RR-ER-412",
    image_urls: ["/catalogue/chandbali-earrings.jpg"],
    finish: "Oxidised Champagne Gold",
    sizes: [],
    is_featured: false,
    availability_status: "in_stock",
    is_published: true
  },
  {
    id: 5,
    category_id: 5,
    category_slug: "bentex-jewellery",
    title: "Padmavati Bentex Temple Rani Haar Set",
    slug: "padmavati-bentex-temple-rani-haar",
    description: "Traditional Bentex gold-toned long temple necklace crafted with stamped lotus and coin motifs, paired with matching lotus ear studs for classic bridal and festive wear.",
    price_inr: 2950,
    sku: "RR-BX-501",
    image_urls: ["/catalogue/bentex-haar.jpg"],
    finish: "Traditional Bentex Matte Gold",
    sizes: ["Long Haar + Matching Studs"],
    is_featured: false,
    availability_status: "in_stock",
    is_published: true
  },
  {
    id: 6,
    category_id: 6,
    category_slug: "accessories",
    title: "Zari Pearl Maang Tikka & Hathphool Suite",
    slug: "zari-pearl-maang-tikka-hathphool",
    description: "Delicate multi-strand pearl hathphool hand harness paired with a crescent filigree maang tikka, crafted for intimate celebrations and wedding festivities.",
    price_inr: 1850,
    sku: "RR-AC-608",
    image_urls: ["/catalogue/maang-tikka.jpg"],
    finish: "Champagne Gold & Pearl",
    sizes: ["Free Size Adjustable"],
    is_featured: false,
    availability_status: "made_to_order",
    is_published: true
  }
];
var categoriesSeedChecked = false;
var adminSeedChecked = false;
function isAuthorizedBootstrapAdmin(email) {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
function slugifyText(input) {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function isSupabaseSchemaMissingError(err) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return err.code === "PGRST205" || err.code === "42P01" || msg.includes("could not find the table") || msg.includes("does not exist");
}
function throwHelpfulSupabaseWriteError(err, fallback) {
  if (isSupabaseSchemaMissingError(err)) {
    throw new Error(
      'Supabase tables are not initialized yet. Open Dashboard Overview -> click "1. Copy SQL Schema" and run it once in your Supabase SQL Editor.'
    );
  }
  if (err && /row-level security/i.test(err.message || "")) {
    throw new Error(
      "Supabase RLS blocked this write. Ensure you ran the latest SQL schema in Supabase SQL Editor or set SUPABASE_SERVICE_ROLE_KEY in Vercel Environment Variables."
    );
  }
  throw new Error(err?.message || fallback);
}
async function ensureInitialCategoriesSeeded() {
  if (!hasPostgresConfig()) return;
  if (categoriesSeedChecked) return;
  try {
    await ensurePostgresSchemaInitialized();
    const existing = await db.select({ id: categories.id }).from(categories).limit(1);
    if (existing.length === 0) {
      await db.insert(categories).values(
        INITIAL_CATEGORIES.map((c) => ({
          name: c.name,
          slug: c.slug
        }))
      ).onConflictDoNothing({ target: categories.slug });
    }
    categoriesSeedChecked = true;
  } catch (error) {
    console.error("Database error in ensureInitialCategoriesSeeded:", error);
  }
}
async function ensureInitialAdminSeeded() {
  if (!hasPostgresConfig()) return;
  if (adminSeedChecked) return;
  try {
    await ensurePostgresSchemaInitialized();
    const ownerEmails = ["roopranijwellery@gmail.com", "roopranijewellery@gmail.com"];
    for (const ownerEmail of ownerEmails) {
      const rows = await db.select().from(users).where(sql`lower(${users.email}) = ${ownerEmail}`).limit(1);
      const existing = rows[0];
      if (!existing) {
        const uid = ownerEmail === "roopranijwellery@gmail.com" ? "admin_rooprani_owner" : "admin_rooprani_owner_alt";
        await db.insert(users).values({
          uid,
          email: ownerEmail,
          passwordHash: ADMIN_BOOTSTRAP_SCRYPT_HASH,
          fullName: "Rooprani Administrator",
          role: "admin"
        }).onConflictDoUpdate({
          target: users.uid,
          set: {
            role: "admin",
            passwordHash: ADMIN_BOOTSTRAP_SCRYPT_HASH,
            updatedAt: /* @__PURE__ */ new Date()
          }
        });
      } else if (!existing.passwordHash || existing.role !== "admin") {
        await db.update(users).set({
          role: "admin",
          passwordHash: existing.passwordHash || ADMIN_BOOTSTRAP_SCRYPT_HASH,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(users.uid, existing.uid));
      }
    }
    adminSeedChecked = true;
  } catch (error) {
    console.error("Database error in ensureInitialAdminSeeded:", error);
  }
}
function buildBootstrapOwnerVirtualUser(email) {
  const clean = email.trim().toLowerCase();
  const now = /* @__PURE__ */ new Date();
  return {
    uid: clean === "roopranijwellery@gmail.com" ? "admin_rooprani_owner" : "admin_rooprani_owner_alt",
    email: clean,
    passwordHash: ADMIN_BOOTSTRAP_SCRYPT_HASH,
    supabaseUserId: null,
    fullName: "Rooprani Administrator",
    phone: null,
    role: "admin",
    createdAt: now,
    updatedAt: now
  };
}
async function getUserByEmail(email, supabaseAccessToken) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;
  if (hasPostgresConfig()) {
    try {
      await ensurePostgresSchemaInitialized();
      const rows = await db.select().from(users).where(sql`lower(${users.email}) = ${cleanEmail}`).limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error("Database error in getUserByEmail:", error);
      return null;
    }
  }
  try {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const { data } = await client.from("profiles").select("*").eq("email", cleanEmail).maybeSingle();
    if (data) {
      return {
        uid: String(data.id),
        email: String(data.email),
        passwordHash: cleanEmail === "roopranijwellery@gmail.com" || cleanEmail === "roopranijewellery@gmail.com" ? ADMIN_BOOTSTRAP_SCRYPT_HASH : null,
        supabaseUserId: String(data.id),
        fullName: data.full_name ?? null,
        phone: data.phone ?? null,
        role: isAuthorizedBootstrapAdmin(cleanEmail) ? "admin" : String(data.role || "customer"),
        createdAt: data.created_at ? new Date(data.created_at) : /* @__PURE__ */ new Date(),
        updatedAt: data.updated_at ? new Date(data.updated_at) : /* @__PURE__ */ new Date()
      };
    }
  } catch {
  }
  if (cleanEmail === "roopranijwellery@gmail.com" || cleanEmail === "roopranijewellery@gmail.com") {
    return buildBootstrapOwnerVirtualUser(cleanEmail);
  }
  return null;
}
async function getUserByUid(uid, supabaseAccessToken) {
  if (!uid) return null;
  if (hasPostgresConfig()) {
    try {
      await ensurePostgresSchemaInitialized();
      const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
      return rows[0] ?? null;
    } catch (error) {
      console.error("Database error in getUserByUid:", error);
      throw new Error("Unable to load user profile.", { cause: error });
    }
  }
  if (uid === "admin_rooprani_owner") {
    return buildBootstrapOwnerVirtualUser("roopranijwellery@gmail.com");
  }
  if (uid === "admin_rooprani_owner_alt") {
    return buildBootstrapOwnerVirtualUser("roopranijewellery@gmail.com");
  }
  try {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const { data } = await client.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (data) {
      const cleanEmail = String(data.email || "").toLowerCase();
      return {
        uid: String(data.id),
        email: cleanEmail,
        passwordHash: null,
        supabaseUserId: String(data.id),
        fullName: data.full_name ?? null,
        phone: data.phone ?? null,
        role: isAuthorizedBootstrapAdmin(cleanEmail) ? "admin" : String(data.role || "customer"),
        createdAt: data.created_at ? new Date(data.created_at) : /* @__PURE__ */ new Date(),
        updatedAt: data.updated_at ? new Date(data.updated_at) : /* @__PURE__ */ new Date()
      };
    }
  } catch {
  }
  return null;
}
async function upsertUserFromAuth(params) {
  const cleanEmail = params.email.trim().toLowerCase();
  const shouldPromoteAdmin = isAuthorizedBootstrapAdmin(cleanEmail);
  if (!hasPostgresConfig()) {
    const now = /* @__PURE__ */ new Date();
    const role = shouldPromoteAdmin ? "admin" : "customer";
    try {
      if (params.supabaseUserId) {
        const client = createPrivilegedSupabaseClient(params.supabaseAccessToken);
        const { data } = await client.from("profiles").select("*").eq("id", params.supabaseUserId).maybeSingle();
        if (data) {
          return {
            uid: String(data.id),
            email: cleanEmail,
            passwordHash: null,
            supabaseUserId: String(data.id),
            fullName: data.full_name || params.displayName || null,
            phone: data.phone || params.phone || null,
            role: shouldPromoteAdmin ? "admin" : String(data.role || "customer"),
            createdAt: data.created_at ? new Date(data.created_at) : now,
            updatedAt: data.updated_at ? new Date(data.updated_at) : now
          };
        }
      }
    } catch {
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
      updatedAt: now
    };
  }
  try {
    await ensureInitialAdminSeeded();
    let existingRows = await db.select().from(users).where(eq(users.uid, params.uid)).limit(1);
    if (!existingRows[0] && cleanEmail) {
      existingRows = await db.select().from(users).where(sql`lower(${users.email}) = ${cleanEmail}`).limit(1);
    }
    const existing = existingRows[0];
    if (!existing) {
      const inserted = await db.insert(users).values({
        uid: params.uid,
        email: cleanEmail,
        supabaseUserId: params.supabaseUserId || null,
        fullName: params.displayName || null,
        phone: params.phone || null,
        role: shouldPromoteAdmin ? "admin" : "customer"
      }).onConflictDoUpdate({
        target: users.uid,
        set: {
          email: cleanEmail,
          ...shouldPromoteAdmin ? { role: "admin" } : {},
          updatedAt: /* @__PURE__ */ new Date()
        }
      }).returning();
      return inserted[0];
    }
    const nextRole = shouldPromoteAdmin ? "admin" : existing.role;
    const nextName = existing.fullName || params.displayName || null;
    const nextPhone = existing.phone || params.phone || null;
    const nextSupabaseId = params.supabaseUserId || existing.supabaseUserId || null;
    if (existing.email !== cleanEmail || existing.role !== nextRole || existing.fullName !== nextName || existing.phone !== nextPhone || existing.supabaseUserId !== nextSupabaseId) {
      const updated = await db.update(users).set({
        email: cleanEmail,
        fullName: nextName,
        phone: nextPhone,
        supabaseUserId: nextSupabaseId,
        role: nextRole,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.uid, existing.uid)).returning();
      return updated[0];
    }
    return existing;
  } catch (error) {
    console.error("Database error in upsertUserFromAuth:", error);
    throw new Error("Unable to synchronize user account.", { cause: error });
  }
}
async function authenticateUserWithPassword(email, passwordPlain) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !passwordPlain) return null;
  if (!hasPostgresConfig()) {
    if ((cleanEmail === "roopranijwellery@gmail.com" || cleanEmail === "roopranijewellery@gmail.com") && verifyPassword(passwordPlain, ADMIN_BOOTSTRAP_SCRYPT_HASH)) {
      return buildBootstrapOwnerVirtualUser(cleanEmail);
    }
    return null;
  }
  await ensureInitialAdminSeeded();
  const user = await getUserByEmail(cleanEmail);
  if (!user || !user.passwordHash) {
    return null;
  }
  const valid = verifyPassword(passwordPlain, user.passwordHash);
  if (!valid) {
    return null;
  }
  if (isAuthorizedBootstrapAdmin(cleanEmail) && user.role !== "admin") {
    const updated = await db.update(users).set({ role: "admin", updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.uid, user.uid)).returning();
    return updated[0] ?? user;
  }
  return user;
}
async function registerCustomerWithPassword(params) {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim();
  const cleanPhone = params.phone?.trim() || null;
  if (!hasPostgresConfig()) {
    if (isAuthorizedBootstrapAdmin(cleanEmail)) {
      throw new Error("An account with this email already exists. Please sign in instead.");
    }
    const now = /* @__PURE__ */ new Date();
    const uid2 = params.supabaseUserId || `cust_${crypto3.randomUUID()}`;
    return {
      uid: uid2,
      email: cleanEmail,
      passwordHash: null,
      supabaseUserId: params.supabaseUserId || null,
      fullName: cleanName || null,
      phone: cleanPhone,
      role: "customer",
      createdAt: now,
      updatedAt: now
    };
  }
  await ensureInitialAdminSeeded();
  const existing = await getUserByEmail(cleanEmail);
  if (existing && existing.passwordHash) {
    throw new Error("An account with this email already exists. Please sign in instead.");
  }
  const passwordHash = hashPassword(params.passwordPlain);
  if (existing) {
    const updated = await db.update(users).set({
      passwordHash,
      fullName: existing.fullName || cleanName || null,
      phone: existing.phone || cleanPhone,
      supabaseUserId: params.supabaseUserId || existing.supabaseUserId || null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.uid, existing.uid)).returning();
    return updated[0];
  }
  const uid = params.supabaseUserId || `cust_${crypto3.randomUUID()}`;
  const inserted = await db.insert(users).values({
    uid,
    email: cleanEmail,
    passwordHash,
    supabaseUserId: params.supabaseUserId || null,
    fullName: cleanName || null,
    phone: cleanPhone,
    role: "customer"
  }).returning();
  return inserted[0];
}
async function linkSupabaseUserId(uid, supabaseUserId) {
  if (!uid || !supabaseUserId || !hasPostgresConfig()) return;
  try {
    await db.update(users).set({ supabaseUserId, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.uid, uid));
  } catch (error) {
    console.warn("Non-fatal linkSupabaseUserId warning:", error);
  }
}
async function updateCustomerProfile(uid, payload, supabaseAccessToken) {
  if (!hasPostgresConfig()) {
    try {
      const client = createPrivilegedSupabaseClient(supabaseAccessToken);
      const { data, error } = await client.from("profiles").update({
        full_name: payload.fullName.trim() || null,
        phone: payload.phone.trim() || null,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", uid).select("*").maybeSingle();
      if (!error && data) {
        const cleanEmail = String(data.email || "").toLowerCase();
        return {
          uid: String(data.id),
          email: cleanEmail,
          passwordHash: null,
          supabaseUserId: String(data.id),
          fullName: data.full_name ?? null,
          phone: data.phone ?? null,
          role: isAuthorizedBootstrapAdmin(cleanEmail) ? "admin" : String(data.role || "customer"),
          createdAt: data.created_at ? new Date(data.created_at) : /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
      }
    } catch {
    }
    return null;
  }
  try {
    const updated = await db.update(users).set({
      fullName: payload.fullName.trim() || null,
      phone: payload.phone.trim() || null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.uid, uid)).returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error("Database error in updateCustomerProfile:", error);
    throw new Error("Unable to save profile details.", { cause: error });
  }
}
function mapProductRecord(p, c) {
  const resolvedTitle = p.title && p.title.trim() || p.name;
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
      finish: p.finish || void 0,
      sizes: Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : void 0
    },
    is_published: resolvedPublished,
    is_active: resolvedPublished,
    is_featured: p.isFeatured,
    availability_status: p.availabilityStatus,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString()
  };
}
function mapSupabaseProductRow(p, catMap) {
  const catId = Number(p.category_id);
  const category = catMap.get(catId) ?? {
    id: catId || 1,
    name: "Jewellery",
    slug: "jewellery"
  };
  const title = String(p.title || p.name || "");
  const imageUrls = Array.isArray(p.image_urls) ? p.image_urls.filter((u) => typeof u === "string") : [];
  const sizes = Array.isArray(p.sizes) ? p.sizes.filter((s) => typeof s === "string") : [];
  const isPublished = p.is_published !== false;
  const createdAt = typeof p.created_at === "string" ? p.created_at : (/* @__PURE__ */ new Date()).toISOString();
  const updatedAt = typeof p.updated_at === "string" ? p.updated_at : createdAt;
  return {
    id: String(p.id),
    numeric_id: Number(p.id),
    title,
    name: title,
    slug: String(p.slug || ""),
    description: String(p.description || ""),
    price_inr: Number(p.price_inr || 0),
    sku: typeof p.sku === "string" ? p.sku : null,
    category_id: String(category.id),
    category_name: category.name,
    category_slug: category.slug,
    image_urls: imageUrls,
    variants: {
      finish: typeof p.finish === "string" && p.finish ? p.finish : void 0,
      sizes: sizes.length > 0 ? sizes : void 0
    },
    is_published: isPublished,
    is_active: isPublished,
    is_featured: Boolean(p.is_featured),
    availability_status: String(p.availability_status || "available"),
    created_at: createdAt,
    updated_at: updatedAt
  };
}
async function getPublicCatalogue() {
  if (!hasPostgresConfig()) {
    const client = createServerSupabaseClient();
    const [catRes, prodRes] = await Promise.all([
      client.from("categories").select("*").order("id", { ascending: true }),
      client.from("products").select("*").eq("is_published", true).not("availability_status", "in", '("unavailable","out_of_stock")').order("is_featured", { ascending: false }).order("updated_at", { ascending: false })
    ]);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const rawCats = !catRes.error && Array.isArray(catRes.data) && catRes.data.length > 0 ? catRes.data : INITIAL_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      created_at: nowIso,
      updated_at: nowIso
    }));
    const catMap = /* @__PURE__ */ new Map();
    for (const c of rawCats) {
      catMap.set(Number(c.id), {
        id: Number(c.id),
        name: String(c.name),
        slug: String(c.slug)
      });
    }
    const rawProds = !prodRes.error && Array.isArray(prodRes.data) ? prodRes.data : isSupabaseSchemaMissingError(prodRes.error) ? INITIAL_PRODUCTS_SEED.map((p) => ({
      ...p,
      image_urls: [...p.image_urls],
      sizes: [...p.sizes],
      created_at: nowIso,
      updated_at: nowIso
    })) : [];
    return {
      categories: rawCats.map((c) => ({
        id: String(c.id),
        numeric_id: Number(c.id),
        name: String(c.name),
        slug: String(c.slug),
        created_at: String(c.created_at || nowIso),
        updated_at: String(c.updated_at || nowIso)
      })),
      products: rawProds.map((p) => mapSupabaseProductRow(p, catMap))
    };
  }
  try {
    await ensureInitialCategoriesSeeded();
    const categoryRows = await db.select().from(categories).orderBy(categories.id);
    const productRows = await db.select({
      product: products,
      category: categories
    }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).where(
      and(
        eq(products.isPublished, true),
        eq(products.isActive, true),
        notInArray(products.availabilityStatus, ["unavailable", "out_of_stock"])
      )
    ).orderBy(desc(products.isFeatured), desc(products.updatedAt));
    return {
      categories: categoryRows.map((c) => ({
        id: String(c.id),
        numeric_id: c.id,
        name: c.name,
        slug: c.slug,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString()
      })),
      products: productRows.map((row) => mapProductRecord(row.product, row.category))
    };
  } catch (error) {
    console.error("Database error in getPublicCatalogue:", error);
    throw new Error("Unable to load jewellery catalogue.", { cause: error });
  }
}
async function getAdminCatalogueData(supabaseAccessToken) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const [catRes, prodRes, enqRes] = await Promise.all([
      client.from("categories").select("*").order("id", { ascending: true }),
      client.from("products").select("*").order("updated_at", { ascending: false }),
      client.from("enquiries").select("*").order("created_at", { ascending: false })
    ]);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const rawCats = !catRes.error && Array.isArray(catRes.data) && catRes.data.length > 0 ? catRes.data : INITIAL_CATEGORIES.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      created_at: nowIso,
      updated_at: nowIso
    }));
    const catMap = /* @__PURE__ */ new Map();
    for (const c of rawCats) {
      catMap.set(Number(c.id), {
        id: Number(c.id),
        name: String(c.name),
        slug: String(c.slug)
      });
    }
    const rawProds = !prodRes.error && Array.isArray(prodRes.data) ? prodRes.data : isSupabaseSchemaMissingError(prodRes.error) ? INITIAL_PRODUCTS_SEED.map((p) => ({
      ...p,
      image_urls: [...p.image_urls],
      sizes: [...p.sizes],
      created_at: nowIso,
      updated_at: nowIso
    })) : [];
    const rawEnqs = !enqRes.error && Array.isArray(enqRes.data) ? enqRes.data : [];
    const countsByCategory = /* @__PURE__ */ new Map();
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
        totalCategories: rawCats.length
      },
      categories: rawCats.map((c) => ({
        id: String(c.id),
        numeric_id: Number(c.id),
        name: String(c.name),
        slug: String(c.slug),
        product_count: countsByCategory.get(Number(c.id)) ?? 0,
        created_at: String(c.created_at || nowIso),
        updated_at: String(c.updated_at || nowIso)
      })),
      products: rawProds.map((p) => mapSupabaseProductRow(p, catMap)),
      enquiries: rawEnqs.map((e) => ({
        id: Number(e.id),
        user_uid: e.user_uid ?? null,
        product_id: e.product_id !== null && e.product_id !== void 0 ? Number(e.product_id) : null,
        product_name: String(e.product_name || "Direct Boutique Enquiry"),
        product_price_inr: e.product_price_inr !== null && e.product_price_inr !== void 0 ? Number(e.product_price_inr) : null,
        product_sku: typeof e.product_sku === "string" ? e.product_sku : null,
        customer_name: String(e.customer_name || ""),
        customer_phone: String(e.customer_phone || ""),
        customer_email: String(e.customer_email || ""),
        preferred_size: typeof e.preferred_size === "string" ? e.preferred_size : null,
        notes: typeof e.notes === "string" ? e.notes : null,
        status: String(e.status || "new"),
        created_at: String(e.created_at || nowIso)
      }))
    };
  }
  try {
    await ensureInitialCategoriesSeeded();
    const categoryRows = await db.select().from(categories).orderBy(categories.id);
    const productRows = await db.select({
      product: products,
      category: categories
    }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).orderBy(desc(products.updatedAt));
    const enquiryRows = await db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
    const countsByCategory = /* @__PURE__ */ new Map();
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
        totalCategories: categoryRows.length
      },
      categories: categoryRows.map((c) => ({
        id: String(c.id),
        numeric_id: c.id,
        name: c.name,
        slug: c.slug,
        product_count: countsByCategory.get(c.id) ?? 0,
        created_at: c.createdAt.toISOString(),
        updated_at: c.updatedAt.toISOString()
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
        created_at: e.createdAt.toISOString()
      }))
    };
  } catch (error) {
    console.error("Database error in getAdminCatalogueData:", error);
    throw new Error("Unable to load administrator dashboard data.", { cause: error });
  }
}
async function getAdminProductById(id, supabaseAccessToken) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const { data: prodRow, error } = await client.from("products").select("*").eq("id", id).maybeSingle();
    if (error || !prodRow) {
      if (isSupabaseSchemaMissingError(error)) {
        const seedItem = INITIAL_PRODUCTS_SEED.find((p) => p.id === id);
        if (seedItem) {
          const catMap2 = new Map(
            INITIAL_CATEGORIES.map((c) => [c.id, { id: c.id, name: c.name, slug: c.slug }])
          );
          return mapSupabaseProductRow(
            {
              ...seedItem,
              image_urls: [...seedItem.image_urls],
              sizes: [...seedItem.sizes]
            },
            catMap2
          );
        }
      }
      return null;
    }
    const { data: catRow } = await client.from("categories").select("*").eq("id", Number(prodRow.category_id)).maybeSingle();
    const catMap = /* @__PURE__ */ new Map();
    if (catRow) {
      catMap.set(Number(catRow.id), {
        id: Number(catRow.id),
        name: String(catRow.name),
        slug: String(catRow.slug)
      });
    }
    return mapSupabaseProductRow(prodRow, catMap);
  }
  try {
    await ensurePostgresSchemaInitialized();
    const rows = await db.select({
      product: products,
      category: categories
    }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).where(eq(products.id, id)).limit(1);
    if (!rows[0]) return null;
    return mapProductRecord(rows[0].product, rows[0].category);
  } catch (error) {
    console.error("Database error in getAdminProductById:", error);
    throw new Error("Unable to load product details.", { cause: error });
  }
}
async function createCategoryRecord(name, supabaseAccessToken) {
  const trimmed = name.trim();
  const baseSlug = slugifyText(trimmed);
  if (!trimmed || !baseSlug) {
    throw new Error("Category name is required.");
  }
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const existing = await client.from("categories").select("id").eq("slug", baseSlug).maybeSingle();
    if (existing.error) {
      throwHelpfulSupabaseWriteError(existing.error, "Unable to check existing categories.");
    }
    if (existing.data) {
      throw new Error(`A category named "${trimmed}" already exists.`);
    }
    const inserted = await client.from("categories").insert({
      name: trimmed,
      slug: baseSlug,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).select("*").single();
    if (inserted.error || !inserted.data) {
      throwHelpfulSupabaseWriteError(inserted.error, "Unable to create category.");
    }
    const c = inserted.data;
    return {
      id: String(c.id),
      numeric_id: Number(c.id),
      name: String(c.name),
      slug: String(c.slug),
      product_count: 0,
      created_at: String(c.created_at),
      updated_at: String(c.updated_at)
    };
  }
  try {
    const duplicate = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, baseSlug)).limit(1);
    if (duplicate.length > 0) {
      throw new Error(`A category named "${trimmed}" already exists.`);
    }
    const inserted = await db.insert(categories).values({
      name: trimmed,
      slug: baseSlug,
      updatedAt: /* @__PURE__ */ new Date()
    }).returning();
    const c = inserted[0];
    void syncCategoryToSupabase({ name: c.name, slug: c.slug }, supabaseAccessToken);
    return {
      id: String(c.id),
      numeric_id: c.id,
      name: c.name,
      slug: c.slug,
      product_count: 0,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString()
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      throw error;
    }
    console.error("Database error in createCategoryRecord:", error);
    throw new Error("A category with a similar name already exists or could not be created.", {
      cause: error
    });
  }
}
async function updateCategoryRecord(id, name, supabaseAccessToken) {
  const trimmed = name.trim();
  const nextSlug = slugifyText(trimmed);
  if (!trimmed || !nextSlug) {
    throw new Error("Category name is required.");
  }
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const conflict = await client.from("categories").select("id").eq("slug", nextSlug).neq("id", id).maybeSingle();
    if (conflict.data) {
      throw new Error(`Another category already uses the name "${trimmed}".`);
    }
    const updated = await client.from("categories").update({
      name: trimmed,
      slug: nextSlug,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", id).select("*").maybeSingle();
    if (updated.error) {
      throwHelpfulSupabaseWriteError(updated.error, "Unable to rename category.");
    }
    if (!updated.data) {
      throw new Error("Category not found.");
    }
    return {
      id: String(updated.data.id),
      numeric_id: Number(updated.data.id),
      name: String(updated.data.name),
      slug: String(updated.data.slug),
      created_at: String(updated.data.created_at),
      updated_at: String(updated.data.updated_at)
    };
  }
  try {
    const conflicting = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.slug, nextSlug), ne(categories.id, id))).limit(1);
    if (conflicting.length > 0) {
      throw new Error(`Another category already uses the name "${trimmed}".`);
    }
    const updated = await db.update(categories).set({
      name: trimmed,
      slug: nextSlug,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(categories.id, id)).returning();
    if (!updated[0]) {
      throw new Error("Category not found.");
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
      updated_at: updated[0].updatedAt.toISOString()
    };
  } catch (error) {
    if (error instanceof Error && (error.message.includes("Another category") || error.message === "Category not found.")) {
      throw error;
    }
    console.error("Database error in updateCategoryRecord:", error);
    throw new Error("Unable to rename category.", { cause: error });
  }
}
async function reassignCategoryProductsRecord(fromCategoryId, toCategoryId, supabaseAccessToken) {
  if (fromCategoryId === toCategoryId) {
    throw new Error("Please choose a different destination category.");
  }
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const targetCat = await client.from("categories").select("id").eq("id", toCategoryId).maybeSingle();
    if (!targetCat.data) {
      throw new Error("Destination category does not exist.");
    }
    const upd = await client.from("products").update({
      category_id: toCategoryId,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("category_id", fromCategoryId);
    if (upd.error) {
      throwHelpfulSupabaseWriteError(upd.error, "Unable to reassign products.");
    }
    return;
  }
  try {
    const targetCat = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, toCategoryId)).limit(1);
    if (!targetCat[0]) {
      throw new Error("Destination category does not exist.");
    }
    await db.update(products).set({
      categoryId: toCategoryId,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(products.categoryId, fromCategoryId));
  } catch (error) {
    if (error instanceof Error && error.message.includes("Destination category")) {
      throw error;
    }
    console.error("Database error in reassignCategoryProductsRecord:", error);
    throw new Error("Unable to reassign products to the selected category.", { cause: error });
  }
}
async function deleteCategoryRecord(id, supabaseAccessToken) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const { count } = await client.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
    if ((count ?? 0) > 0) {
      throw new Error(
        `Cannot delete this category while ${count} product(s) are assigned to it. Reassign those products to another category first.`
      );
    }
    const del = await client.from("categories").delete().eq("id", id);
    if (del.error) {
      throwHelpfulSupabaseWriteError(del.error, "Unable to delete category.");
    }
    return;
  }
  try {
    const countRows = await db.select({ count: sql`count(*)::int` }).from(products).where(eq(products.categoryId, id));
    const attachedCount = countRows[0]?.count ?? 0;
    if (attachedCount > 0) {
      throw new Error(
        `Cannot delete this category while ${attachedCount} product(s) are assigned to it. Reassign those products to another category first.`
      );
    }
    await db.delete(categories).where(eq(categories.id, id));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Cannot delete this category")) {
      throw error;
    }
    console.error("Database error in deleteCategoryRecord:", error);
    throw new Error("Unable to delete category.", { cause: error });
  }
}
function extractInternalMediaAssetIds(urls) {
  const ids = /* @__PURE__ */ new Set();
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
async function cleanupUnusedMediaAssets(candidateUrls, supabaseAccessToken) {
  await deleteImagesFromSupabaseStorage(candidateUrls, supabaseAccessToken);
  if (!hasPostgresConfig()) return;
  const candidateIds = extractInternalMediaAssetIds(candidateUrls);
  if (candidateIds.length === 0) return;
  try {
    const allProductUrls = await db.select({ imageUrls: products.imageUrls }).from(products);
    const referencedIds = /* @__PURE__ */ new Set();
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
    console.error("Non-fatal media cleanup warning:", error);
  }
}
async function deleteMediaAssetByIdIfUnused(id) {
  if (!hasPostgresConfig() || id <= 0) return;
  await cleanupUnusedMediaAssets([`/api/media/${id}`]);
}
async function createProductRecord(payload, supabaseAccessToken) {
  const cleanTitle = payload.title.trim();
  const baseSlug = slugifyText(payload.slug || cleanTitle);
  if (!baseSlug || cleanTitle.length < 2) {
    throw new Error("A valid product title is required.");
  }
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const catRes = await client.from("categories").select("*").eq("id", payload.categoryId).maybeSingle();
    if (catRes.error) {
      throwHelpfulSupabaseWriteError(catRes.error, "Unable to read selected category.");
    }
    if (!catRes.data) {
      throw new Error("Selected category was not found.");
    }
    const existingSlug = await client.from("products").select("id").eq("slug", baseSlug).maybeSingle();
    const finalSlug = existingSlug.data ? `${baseSlug}-${Date.now().toString(36).slice(-5)}` : baseSlug;
    if (payload.isFeatured && payload.isPublished) {
      await client.from("products").update({ is_featured: false }).eq("is_featured", true);
    }
    const inserted = await client.from("products").insert({
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
      availability_status: payload.availabilityStatus
    }).select("*").single();
    if (inserted.error || !inserted.data) {
      throwHelpfulSupabaseWriteError(inserted.error, "Unable to create jewellery product.");
    }
    const catMap = /* @__PURE__ */ new Map([
      [
        Number(catRes.data.id),
        {
          id: Number(catRes.data.id),
          name: String(catRes.data.name),
          slug: String(catRes.data.slug)
        }
      ]
    ]);
    return mapSupabaseProductRow(inserted.data, catMap);
  }
  try {
    const catCheck = await db.select().from(categories).where(eq(categories.id, payload.categoryId)).limit(1);
    if (!catCheck[0]) {
      throw new Error("Selected category was not found.");
    }
    const existingSlug = await db.select({ id: products.id }).from(products).where(eq(products.slug, baseSlug)).limit(1);
    const finalSlug = existingSlug.length > 0 ? `${baseSlug}-${Date.now().toString(36).slice(-5)}` : baseSlug;
    if (payload.isFeatured && payload.isPublished) {
      await db.update(products).set({ isFeatured: false });
    }
    const inserted = await db.insert(products).values({
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
      availabilityStatus: payload.availabilityStatus
    }).returning();
    const row = inserted[0];
    const cat = catCheck[0];
    const cloudSafeImages = (row.imageUrls ?? []).filter((u) => !u.startsWith("/api/media/"));
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
          isPublished: Boolean(row.isPublished && row.isActive)
        },
        supabaseAccessToken
      );
    }
    return mapProductRecord(row, cat);
  } catch (error) {
    if (error instanceof Error && error.message === "Selected category was not found.") {
      throw error;
    }
    console.error("Database error in createProductRecord:", error);
    throw new Error("Unable to create jewellery product.", { cause: error });
  }
}
async function updateProductRecord(id, payload, supabaseAccessToken) {
  const cleanTitle = payload.title.trim();
  const desiredSlug = slugifyText(payload.slug || cleanTitle);
  if (!desiredSlug || cleanTitle.length < 2) {
    throw new Error("A valid product title is required.");
  }
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const existingRes = await client.from("products").select("*").eq("id", id).maybeSingle();
    if (existingRes.error) {
      throwHelpfulSupabaseWriteError(existingRes.error, "Unable to load product.");
    }
    if (!existingRes.data) {
      throw new Error("Product not found.");
    }
    const catRes = await client.from("categories").select("*").eq("id", payload.categoryId).maybeSingle();
    if (!catRes.data) {
      throw new Error("Selected category was not found.");
    }
    const conflictRes = await client.from("products").select("id").eq("slug", desiredSlug).neq("id", id).maybeSingle();
    const finalSlug = conflictRes.data ? `${desiredSlug}-${Date.now().toString(36).slice(-5)}` : desiredSlug;
    if (payload.isFeatured && payload.isPublished) {
      await client.from("products").update({ is_featured: false }).eq("is_featured", true).neq("id", id);
    }
    const prevUrls = Array.isArray(existingRes.data.image_urls) ? existingRes.data.image_urls : [];
    const updatedRes = await client.from("products").update({
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
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", id).select("*").single();
    if (updatedRes.error || !updatedRes.data) {
      throwHelpfulSupabaseWriteError(updatedRes.error, "Unable to update jewellery product.");
    }
    const removedUrls = prevUrls.filter((u) => !payload.imageUrls.includes(u));
    if (removedUrls.length > 0) {
      await cleanupUnusedMediaAssets(removedUrls, supabaseAccessToken);
    }
    const catMap = /* @__PURE__ */ new Map([
      [
        Number(catRes.data.id),
        {
          id: Number(catRes.data.id),
          name: String(catRes.data.name),
          slug: String(catRes.data.slug)
        }
      ]
    ]);
    return mapSupabaseProductRow(updatedRes.data, catMap);
  }
  try {
    const existingRows = await db.select().from(products).where(eq(products.id, id)).limit(1);
    const existingProduct = existingRows[0];
    if (!existingProduct) {
      throw new Error("Product not found.");
    }
    const catCheck = await db.select().from(categories).where(eq(categories.id, payload.categoryId)).limit(1);
    if (!catCheck[0]) {
      throw new Error("Selected category was not found.");
    }
    const conflicting = await db.select({ id: products.id }).from(products).where(eq(products.slug, desiredSlug));
    const hasConflict = conflicting.some((row2) => row2.id !== id);
    const finalSlug = hasConflict ? `${desiredSlug}-${Date.now().toString(36).slice(-5)}` : desiredSlug;
    if (payload.isFeatured && payload.isPublished) {
      await db.update(products).set({ isFeatured: false }).where(ne(products.id, id));
    }
    const previousUrls = Array.isArray(existingProduct.imageUrls) ? existingProduct.imageUrls : [];
    const updated = await db.update(products).set({
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
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(products.id, id)).returning();
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
        isPublished: Boolean(row.isPublished && row.isActive)
      },
      supabaseAccessToken
    );
    return mapProductRecord(row, cat);
  } catch (error) {
    if (error instanceof Error && (error.message === "Product not found." || error.message === "Selected category was not found.")) {
      throw error;
    }
    console.error("Database error in updateProductRecord:", error);
    throw new Error("Unable to update jewellery product.", { cause: error });
  }
}
async function deleteProductRecord(id, supabaseAccessToken) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const existingRes = await client.from("products").select("id, image_urls").eq("id", id).maybeSingle();
    if (!existingRes.data) {
      throw new Error("Product not found.");
    }
    const urlsToClean = Array.isArray(existingRes.data.image_urls) ? existingRes.data.image_urls : [];
    const del = await client.from("products").delete().eq("id", id);
    if (del.error) {
      throwHelpfulSupabaseWriteError(del.error, "Unable to delete jewellery product.");
    }
    if (urlsToClean.length > 0) {
      await cleanupUnusedMediaAssets(urlsToClean, supabaseAccessToken);
    }
    return;
  }
  try {
    const existingRows = await db.select({ id: products.id, slug: products.slug, imageUrls: products.imageUrls }).from(products).where(eq(products.id, id)).limit(1);
    if (!existingRows[0]) {
      throw new Error("Product not found.");
    }
    const urlsToClean = Array.isArray(existingRows[0].imageUrls) ? existingRows[0].imageUrls : [];
    const deletedSlug = existingRows[0].slug;
    await db.delete(products).where(eq(products.id, id));
    void deleteProductFromSupabaseBySlug(deletedSlug, supabaseAccessToken);
    if (urlsToClean.length > 0) {
      await cleanupUnusedMediaAssets(urlsToClean, supabaseAccessToken);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Product not found.") {
      throw error;
    }
    console.error("Database error in deleteProductRecord:", error);
    throw new Error("Unable to delete jewellery product.", { cause: error });
  }
}
async function createMediaAssetRecord(params) {
  if (!hasPostgresConfig()) {
    throw new Error("PostgreSQL binary storage is not configured in this environment.");
  }
  try {
    await ensurePostgresSchemaInitialized();
    const inserted = await db.insert(mediaAssets).values({
      filename: params.filename,
      mimeType: params.mimeType,
      dataBase64: params.dataBase64,
      sizeBytes: params.sizeBytes
    }).returning({ id: mediaAssets.id });
    return inserted[0];
  } catch (error) {
    console.error("Database error in createMediaAssetRecord:", error);
    throw new Error("Unable to store uploaded image.", { cause: error });
  }
}
async function getMediaAssetRecord(id) {
  if (!hasPostgresConfig()) return null;
  try {
    await ensurePostgresSchemaInitialized();
    const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error("Database error in getMediaAssetRecord:", error);
    throw new Error("Unable to retrieve image asset.", { cause: error });
  }
}
async function createEnquiryRecord(params, supabaseAccessToken) {
  if (!hasPostgresConfig()) {
    const now = /* @__PURE__ */ new Date();
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
        status: "new",
        createdAt: now.toISOString()
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
      status: "new",
      supabaseSynced: sbResult.synced,
      createdAt: now
    };
  }
  try {
    await ensurePostgresSchemaInitialized();
    if (params.userUid) {
      await db.update(users).set({
        fullName: params.customerName.trim(),
        phone: params.customerPhone.trim(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.uid, params.userUid));
    }
    const inserted = await db.insert(enquiries).values({
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
      status: "new"
    }).returning();
    return inserted[0];
  } catch (error) {
    console.error("Database error in createEnquiryRecord:", error);
    throw new Error("Unable to record your enquiry.", { cause: error });
  }
}
async function getCustomerEnquiries(userUid, supabaseAccessToken) {
  if (!hasPostgresConfig()) {
    try {
      const client = createPrivilegedSupabaseClient(supabaseAccessToken);
      const { data, error } = await client.from("enquiries").select("*").or(`user_uid.eq.${userUid},auth_user_id.eq.${userUid}`).order("created_at", { ascending: false });
      if (error || !Array.isArray(data)) return [];
      return data.map((e) => ({
        id: Number(e.id),
        product_id: e.product_id !== null && e.product_id !== void 0 ? Number(e.product_id) : null,
        product_name: String(e.product_name || "Direct Boutique Enquiry"),
        product_price_inr: e.product_price_inr !== null && e.product_price_inr !== void 0 ? Number(e.product_price_inr) : null,
        product_sku: typeof e.product_sku === "string" ? e.product_sku : null,
        customer_name: String(e.customer_name || ""),
        customer_phone: String(e.customer_phone || ""),
        customer_email: String(e.customer_email || ""),
        preferred_size: typeof e.preferred_size === "string" ? e.preferred_size : null,
        notes: typeof e.notes === "string" ? e.notes : null,
        status: String(e.status || "new"),
        created_at: String(e.created_at || (/* @__PURE__ */ new Date()).toISOString())
      }));
    } catch {
      return [];
    }
  }
  try {
    const rows = await db.select().from(enquiries).where(eq(enquiries.userUid, userUid)).orderBy(desc(enquiries.createdAt));
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
      created_at: e.createdAt.toISOString()
    }));
  } catch (error) {
    console.error("Database error in getCustomerEnquiries:", error);
    throw new Error("Unable to load your enquiries.", { cause: error });
  }
}
async function updateEnquiryStatusRecord(id, status, supabaseAccessToken) {
  if (!hasPostgresConfig()) {
    const client = createPrivilegedSupabaseClient(supabaseAccessToken);
    const [enqUpd] = await Promise.all([
      client.from("enquiries").update({ status }).eq("id", id).select("*").maybeSingle(),
      client.from("orders").update({ status }).eq("id", id)
    ]);
    if (enqUpd.error) {
      throwHelpfulSupabaseWriteError(enqUpd.error, "Unable to update enquiry status.");
    }
    return enqUpd.data ?? null;
  }
  try {
    const updated = await db.update(enquiries).set({ status }).where(eq(enquiries.id, id)).returning();
    if (updated[0]) {
      const client = createPrivilegedSupabaseClient(supabaseAccessToken);
      void Promise.allSettled([
        client.from("enquiries").update({ status }).eq("local_enquiry_id", id),
        client.from("orders").update({ status }).eq("local_enquiry_id", id)
      ]);
    }
    return updated[0] ?? null;
  } catch (error) {
    console.error("Database error in updateEnquiryStatusRecord:", error);
    throw new Error("Unable to update enquiry status.", { cause: error });
  }
}
async function markEnquirySyncedToSupabase(id) {
  if (!hasPostgresConfig()) return;
  try {
    await db.update(enquiries).set({ supabaseSynced: true }).where(eq(enquiries.id, id));
  } catch (error) {
    console.warn("Non-fatal markEnquirySyncedToSupabase warning:", error);
  }
}
async function getUnsyncedEnquiries() {
  if (!hasPostgresConfig()) return [];
  try {
    return await db.select().from(enquiries).where(eq(enquiries.supabaseSynced, false)).orderBy(enquiries.id);
  } catch (error) {
    console.error("Database error in getUnsyncedEnquiries:", error);
    return [];
  }
}
async function getAllUsersForSync() {
  if (!hasPostgresConfig()) return [];
  try {
    return await db.select().from(users).orderBy(users.createdAt);
  } catch (error) {
    console.error("Database error in getAllUsersForSync:", error);
    return [];
  }
}
async function getAllCatalogueForSupabaseSync() {
  if (!hasPostgresConfig()) return { categories: [], products: [] };
  try {
    await ensureInitialCategoriesSeeded();
    const categoryRows = await db.select().from(categories).orderBy(categories.id);
    const productRows = await db.select({
      product: products,
      category: categories
    }).from(products).innerJoin(categories, eq(products.categoryId, categories.id)).orderBy(products.id);
    return {
      categories: categoryRows,
      products: productRows
    };
  } catch {
    return { categories: [], products: [] };
  }
}

// src/lib/firebase-admin.ts
import fs2 from "node:fs";
import path2 from "node:path";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
var FALLBACK_FIREBASE_PROJECT_ID = "neat-gate-29tls";
function resolveFirebaseProjectId() {
  const envProjectId = (process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "").trim();
  if (envProjectId) {
    return envProjectId;
  }
  try {
    const configPath = path2.join(process.cwd(), "firebase-applet-config.json");
    if (fs2.existsSync(configPath)) {
      const parsed = JSON.parse(fs2.readFileSync(configPath, "utf8"));
      if (parsed.projectId && parsed.projectId.trim()) {
        return parsed.projectId.trim();
      }
    }
  } catch {
  }
  return FALLBACK_FIREBASE_PROJECT_ID;
}
var cachedAuth = null;
function getFirebaseAdminAuth() {
  if (cachedAuth) return cachedAuth;
  try {
    if (!getApps().length) {
      initializeApp({
        projectId: resolveFirebaseProjectId()
      });
    }
    cachedAuth = getAuth();
    return cachedAuth;
  } catch (err) {
    console.warn("Firebase Admin initialization skipped:", err);
    return null;
  }
}
var adminAuth = getFirebaseAdminAuth();

// src/middleware/auth.ts
function readOptionalSupabaseHeader(req) {
  const raw = req.headers["x-supabase-auth"];
  if (typeof raw === "string" && raw.trim().length > 20) {
    return raw.trim();
  }
  return void 0;
}
async function resolveAuthenticatedUserFromToken(token, headerSupabaseToken) {
  if (!token) return null;
  if (token.startsWith("rpr_v1.")) {
    const payload = verifySignedSessionToken(token);
    if (!payload) return null;
    await ensureInitialAdminSeeded();
    const record = await getUserByUid(payload.uid, headerSupabaseToken) || await getUserByEmail(payload.email, headerSupabaseToken);
    if (record) {
      return {
        supabaseAccessToken: headerSupabaseToken,
        dbUser: {
          uid: record.uid,
          email: record.email,
          fullName: record.fullName ?? payload.fullName ?? null,
          phone: record.phone ?? payload.phone ?? null,
          role: isAuthorizedBootstrapAdmin(record.email) ? "admin" : record.role,
          supabaseUserId: record.supabaseUserId ?? payload.supabaseUserId ?? null
        }
      };
    }
    if (!hasPostgresConfig()) {
      const cleanEmail = payload.email.toLowerCase().trim();
      const verifiedRole = isAuthorizedBootstrapAdmin(cleanEmail) ? "admin" : payload.role === "admin" && isAuthorizedBootstrapAdmin(cleanEmail) ? "admin" : "customer";
      return {
        supabaseAccessToken: headerSupabaseToken,
        dbUser: {
          uid: payload.uid,
          email: cleanEmail,
          fullName: payload.fullName ?? null,
          phone: payload.phone ?? null,
          role: verifiedRole,
          supabaseUserId: payload.supabaseUserId ?? null
        }
      };
    }
    return null;
  }
  const sbUser = await verifySupabaseAccessToken(token);
  if (sbUser && sbUser.email) {
    const meta = sbUser.user_metadata ?? {};
    const synced = await upsertUserFromAuth({
      uid: sbUser.id,
      email: sbUser.email,
      displayName: typeof meta.full_name === "string" ? meta.full_name : null,
      phone: typeof meta.phone === "string" ? meta.phone : null,
      supabaseUserId: sbUser.id,
      emailVerified: Boolean(sbUser.email_confirmed_at),
      supabaseAccessToken: token
    });
    return {
      supabaseAccessToken: token,
      dbUser: {
        uid: synced.uid,
        email: synced.email,
        fullName: synced.fullName,
        phone: synced.phone,
        role: synced.role,
        supabaseUserId: synced.supabaseUserId
      }
    };
  }
  const fbAuth = getFirebaseAdminAuth();
  if (fbAuth) {
    try {
      const decodedToken = await fbAuth.verifyIdToken(token);
      const synced = await upsertUserFromAuth({
        uid: decodedToken.uid,
        email: decodedToken.email || "",
        displayName: decodedToken.name || null,
        emailVerified: Boolean(decodedToken.email_verified)
      });
      return {
        decodedFirebase: decodedToken,
        supabaseAccessToken: headerSupabaseToken,
        dbUser: {
          uid: synced.uid,
          email: synced.email,
          fullName: synced.fullName,
          phone: synced.phone,
          role: synced.role,
          supabaseUserId: synced.supabaseUserId
        }
      };
    } catch {
      return null;
    }
  }
  return null;
}
var requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Please sign in to continue." });
    return;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const headerSupabaseToken = readOptionalSupabaseHeader(req);
  try {
    const resolved = await resolveAuthenticatedUserFromToken(token, headerSupabaseToken);
    if (!resolved) {
      res.status(401).json({ error: "Unauthorized: Invalid or expired session." });
      return;
    }
    if (resolved.decodedFirebase) {
      req.user = resolved.decodedFirebase;
    }
    if (resolved.supabaseAccessToken) {
      req.supabaseAccessToken = resolved.supabaseAccessToken;
    }
    req.dbUser = resolved.dbUser;
    next();
  } catch (error) {
    console.error("Error verifying authentication session:", error);
    res.status(401).json({ error: "Unauthorized: Invalid or expired session." });
  }
};
var optionalAuth = async (req, _res, next) => {
  const headerSupabaseToken = readOptionalSupabaseHeader(req);
  if (headerSupabaseToken) {
    req.supabaseAccessToken = headerSupabaseToken;
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  try {
    const resolved = await resolveAuthenticatedUserFromToken(token, headerSupabaseToken);
    if (resolved) {
      if (resolved.decodedFirebase) {
        req.user = resolved.decodedFirebase;
      }
      if (resolved.supabaseAccessToken) {
        req.supabaseAccessToken = resolved.supabaseAccessToken;
      }
      req.dbUser = resolved.dbUser;
    }
  } catch {
  }
  next();
};
var requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, () => {
    if (!req.dbUser || req.dbUser.role !== "admin") {
      res.status(403).json({ error: "Forbidden: Administrator privileges required." });
      return;
    }
    next();
  });
};

// src/server/app.ts
var ALLOWED_IMAGE_MIME_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var MAX_IMAGE_BYTES = 4 * 1024 * 1024;
var ALLOWED_AVAILABILITY = /* @__PURE__ */ new Set([
  "available",
  "unavailable",
  "in_stock",
  "made_to_order",
  "limited",
  "out_of_stock"
]);
var ALLOWED_ENQUIRY_STATUS = /* @__PURE__ */ new Set(["new", "contacted", "completed"]);
var AUTH_WINDOW_MS = 5 * 60 * 1e3;
var AUTH_MAX_ATTEMPTS = 25;
var authAttemptsByIp = /* @__PURE__ */ new Map();
function authRateLimiter(req, res, next) {
  const now = Date.now();
  if (authAttemptsByIp.size > 1e3) {
    for (const [k, v] of authAttemptsByIp.entries()) {
      if (v.resetAt <= now) authAttemptsByIp.delete(k);
    }
  }
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : void 0) || req.socket?.remoteAddress || "unknown";
  const current = authAttemptsByIp.get(ip);
  if (!current || current.resetAt <= now) {
    authAttemptsByIp.set(ip, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    next();
    return;
  }
  if (current.count >= AUTH_MAX_ATTEMPTS) {
    const retryAfterSec = Math.max(1, Math.ceil((current.resetAt - now) / 1e3));
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: "Too many authentication attempts. Please wait a minute and try again."
    });
    return;
  }
  current.count += 1;
  next();
}
function sendSafeError(res, error, fallbackMessage, status = 500) {
  const message = error instanceof Error && error.message ? error.message : fallbackMessage;
  res.status(status).json({ error: message });
}
function validateProductBody(body) {
  const rawTitle = typeof body.title === "string" && body.title.trim() ? body.title.trim() : typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const rawPrice = body.priceInr ?? body.price_inr;
  const priceInr = typeof rawPrice === "number" || typeof rawPrice === "string" ? Number(rawPrice) : NaN;
  const rawCategoryId = body.categoryId ?? body.category_id;
  const categoryId = Number(rawCategoryId);
  const rawImages = Array.isArray(body.imageUrls) ? body.imageUrls : Array.isArray(body.image_urls) ? body.image_urls : [];
  const imageUrls = rawImages.filter((u) => typeof u === "string" && u.trim().length > 0).map((u) => u.trim());
  const sizes = Array.isArray(body.sizes) ? body.sizes.filter((s) => typeof s === "string" && s.trim().length > 0).map((s) => s.trim()) : [];
  const rawAvailability = typeof body.availabilityStatus === "string" ? body.availabilityStatus : typeof body.availability_status === "string" ? body.availability_status : "available";
  if (!ALLOWED_AVAILABILITY.has(rawAvailability)) {
    return { error: "Invalid availability status." };
  }
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { error: "Please select a valid category." };
  }
  if (rawTitle.length < 3 || rawTitle.length > 160) {
    return {
      error: "Product title must be between 3 and 160 characters."
    };
  }
  if (description.length < 5) {
    return {
      error: "Please enter a product description (at least 5 characters)."
    };
  }
  if (imageUrls.length === 0) {
    return {
      error: "Please upload at least one product photo."
    };
  }
  if (!Number.isFinite(priceInr) || priceInr < 0 || priceInr > 1e8) {
    return {
      error: "Please enter a valid non-negative price in INR."
    };
  }
  const isPublished = body.isPublished !== void 0 ? Boolean(body.isPublished) : body.is_published !== void 0 ? Boolean(body.is_published) : body.isActive !== void 0 ? Boolean(body.isActive) : true;
  return {
    value: {
      title: rawTitle,
      slug: typeof body.slug === "string" ? body.slug : void 0,
      description,
      priceInr: Math.round(priceInr),
      sku: typeof body.sku === "string" ? body.sku.trim() || null : null,
      categoryId,
      imageUrls,
      finish: typeof body.finish === "string" ? body.finish.trim() || null : null,
      sizes,
      isPublished,
      isFeatured: Boolean(body.isFeatured ?? body.is_featured),
      availabilityStatus: rawAvailability
    }
  };
}
var coldStartBootstrapPromise = null;
async function ensureBackendInitialized() {
  if (!hasPostgresConfig()) return;
  if (!coldStartBootstrapPromise) {
    coldStartBootstrapPromise = (async () => {
      await ensurePostgresSchemaInitialized();
      await Promise.all([ensureInitialAdminSeeded(), ensureInitialCategoriesSeeded()]);
    })().catch((err) => {
      coldStartBootstrapPromise = null;
      console.error("Backend bootstrap warning:", err);
    });
  }
  await coldStartBootstrapPromise;
}
function createApiApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "4.5mb" }));
  app.use("/api", async (req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (!req.path.startsWith("/media/")) {
      res.setHeader("Cache-Control", "no-store, max-age=0");
    }
    await ensureBackendInitialized();
    next();
  });
  app.get("/api/health", async (_req, res) => {
    const pgHealth = await checkPostgresHealth();
    res.json({
      ok: true,
      service: "rooprani-api",
      runtime: process.env.VERCEL ? "vercel-serverless" : "node-server",
      databaseMode: pgHealth.configured ? "postgresql+supabase" : "supabase-cloud",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }
    if (!password) {
      res.status(400).json({ error: "Please enter your password." });
      return;
    }
    try {
      let user = await authenticateUserWithPassword(rawEmail, password);
      let supabaseUserId = user?.supabaseUserId ?? null;
      let supabaseAccessToken = null;
      if (!user) {
        const sbClient = createServerSupabaseClient();
        const sbRes = await sbClient.auth.signInWithPassword({
          email: rawEmail,
          password
        });
        if (sbRes.data?.user && sbRes.data.user.email) {
          const meta = sbRes.data.user.user_metadata ?? {};
          supabaseUserId = sbRes.data.user.id;
          supabaseAccessToken = sbRes.data.session?.access_token ?? null;
          user = await upsertUserFromAuth({
            uid: sbRes.data.user.id,
            email: sbRes.data.user.email,
            displayName: typeof meta.full_name === "string" ? meta.full_name : null,
            phone: typeof meta.phone === "string" ? meta.phone : null,
            supabaseUserId,
            emailVerified: Boolean(sbRes.data.user.email_confirmed_at),
            supabaseAccessToken: supabaseAccessToken ?? void 0
          });
        } else if (sbRes.error && /email not confirmed/i.test(sbRes.error.message || "")) {
          res.status(401).json({
            error: "Your email is pending confirmation. Please verify your email or run the 1-step Supabase SQL setup in Admin Dashboard."
          });
          return;
        }
      }
      if (!user) {
        res.status(401).json({
          error: "Incorrect email or password. Please verify your credentials and try again."
        });
        return;
      }
      const sbSync = await syncUserLoginToSupabase({
        userUid: user.uid,
        email: user.email,
        password: supabaseAccessToken ? void 0 : password,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        authProvider: "email"
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
        supabaseUserId
      });
      const enquiries2 = await getCustomerEnquiries(
        user.uid,
        supabaseAccessToken ?? void 0
      );
      res.json({
        token,
        supabaseAccessToken,
        user: {
          uid: user.uid,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          role: user.role
        },
        enquiries: enquiries2,
        redirectTo: user.role === "admin" ? "/admin" : null
      });
    } catch (error) {
      sendSafeError(res, error, "Unable to sign in right now.");
    }
  });
  app.post("/api/auth/register", authRateLimiter, async (req, res) => {
    const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    if (fullName.length < 2) {
      res.status(400).json({ error: "Please enter your full name." });
      return;
    }
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters long." });
      return;
    }
    if (phone) {
      const digits = phone.replace(/[^\d]/g, "");
      if (digits.length < 8 || digits.length > 15) {
        res.status(400).json({ error: "Please enter a valid 10-digit phone number." });
        return;
      }
    }
    try {
      let supabaseUserId = null;
      let supabaseAccessToken = null;
      try {
        const sbClient = createServerSupabaseClient();
        const sbSignup = await sbClient.auth.signUp({
          email: rawEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone || ""
            }
          }
        });
        if (sbSignup.error && /already registered/i.test(sbSignup.error.message || "")) {
          res.status(409).json({
            error: "An account with this email already exists. Please sign in instead."
          });
          return;
        }
        if (sbSignup.data?.user) {
          supabaseUserId = sbSignup.data.user.id;
          supabaseAccessToken = sbSignup.data.session?.access_token ?? null;
        }
      } catch (sbErr) {
        console.warn("Non-fatal Supabase signup warning:", sbErr);
      }
      const createdUser = await registerCustomerWithPassword({
        email: rawEmail,
        passwordPlain: password,
        fullName,
        phone: phone || null,
        supabaseUserId
      });
      await syncUserLoginToSupabase({
        userUid: createdUser.uid,
        email: createdUser.email,
        fullName: createdUser.fullName,
        phone: createdUser.phone,
        role: createdUser.role,
        authProvider: "email"
      });
      const token = createSignedSessionToken({
        uid: createdUser.uid,
        email: createdUser.email,
        role: createdUser.role,
        fullName: createdUser.fullName,
        phone: createdUser.phone,
        supabaseUserId: createdUser.supabaseUserId
      });
      res.status(201).json({
        token,
        supabaseAccessToken,
        user: {
          uid: createdUser.uid,
          email: createdUser.email,
          fullName: createdUser.fullName,
          phone: createdUser.phone,
          role: createdUser.role
        },
        enquiries: [],
        redirectTo: createdUser.role === "admin" ? "/admin" : null
      });
    } catch (error) {
      const isConflict = error instanceof Error && error.message.includes("already exists");
      sendSafeError(
        res,
        error,
        "Unable to create your account right now.",
        isConflict ? 409 : 500
      );
    }
  });
  app.get("/api/catalogue", async (_req, res) => {
    try {
      const catalogue = await getPublicCatalogue();
      res.json(catalogue);
    } catch (error) {
      sendSafeError(res, error, "Unable to load jewellery catalogue.");
    }
  });
  app.get("/api/media/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid media identifier." });
      return;
    }
    try {
      const asset = await getMediaAssetRecord(id);
      if (!asset) {
        res.status(404).json({ error: "Image not found." });
        return;
      }
      const buffer = Buffer.from(asset.dataBase64, "base64");
      res.setHeader("Content-Type", asset.mimeType);
      res.setHeader("Content-Length", String(buffer.length));
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.send(buffer);
    } catch (error) {
      sendSafeError(res, error, "Unable to load image.");
    }
  });
  const handleCustomerOrderOrEnquiry = async (req, res) => {
    const {
      productId,
      productName,
      productPriceInr,
      productSku,
      customerName,
      customerPhone,
      customerEmail,
      preferredSize,
      notes
    } = req.body ?? {};
    const cleanName = typeof customerName === "string" ? customerName.trim() : "";
    const cleanPhone = typeof customerPhone === "string" ? customerPhone.trim() : "";
    const cleanEmail = typeof customerEmail === "string" ? customerEmail.trim() : "";
    const cleanProductName = typeof productName === "string" && productName.trim() ? productName.trim() : "Direct Boutique Enquiry";
    if (cleanName.length < 2) {
      res.status(400).json({ error: "Please enter your full name." });
      return;
    }
    const phoneDigits = cleanPhone.replace(/[^\d]/g, "");
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
      res.status(400).json({ error: "Please enter a valid 10-digit phone number." });
      return;
    }
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      res.status(400).json({ error: "Please enter a valid email address." });
      return;
    }
    const parsedProductId = productId !== void 0 && productId !== null && Number.isInteger(Number(productId)) ? Number(productId) : null;
    const parsedPrice = productPriceInr !== void 0 && productPriceInr !== null && Number.isFinite(Number(productPriceInr)) ? Math.max(0, Math.round(Number(productPriceInr))) : null;
    try {
      if (parsedProductId !== null) {
        const targetProduct = await getAdminProductById(
          parsedProductId,
          req.supabaseAccessToken
        );
        if (targetProduct && (!targetProduct.is_published || !targetProduct.is_active || targetProduct.availability_status === "unavailable" || targetProduct.availability_status === "out_of_stock")) {
          res.status(400).json({
            error: "This jewellery piece is currently unavailable for enquiry."
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
          productSku: typeof productSku === "string" ? productSku : null,
          customerName: cleanName,
          customerPhone: cleanPhone,
          customerEmail: cleanEmail,
          preferredSize: typeof preferredSize === "string" ? preferredSize : null,
          notes: typeof notes === "string" ? notes : null
        },
        req.supabaseAccessToken
      );
      let supabaseSynced = Boolean(
        "supabaseSynced" in enquiry ? enquiry.supabaseSynced : false
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
            productSku: typeof productSku === "string" ? productSku : null,
            customerName: cleanName,
            customerPhone: cleanPhone,
            customerEmail: cleanEmail,
            preferredSize: typeof preferredSize === "string" ? preferredSize : null,
            notes: typeof notes === "string" ? notes : null,
            status: enquiry.status,
            createdAt: enquiry.createdAt.toISOString()
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
        supabaseSynced
      });
    } catch (error) {
      sendSafeError(res, error, "Unable to submit your enquiry right now.");
    }
  };
  app.post("/api/enquiries", optionalAuth, handleCustomerOrderOrEnquiry);
  app.post("/api/orders", optionalAuth, handleCustomerOrderOrEnquiry);
  app.get("/api/me", requireAuth, async (req, res) => {
    try {
      if (req.headers["x-record-login"] === "1" && req.dbUser) {
        void syncUserLoginToSupabase({
          userUid: req.dbUser.uid,
          email: req.dbUser.email,
          fullName: req.dbUser.fullName,
          phone: req.dbUser.phone,
          role: req.dbUser.role,
          authProvider: "google"
        });
      }
      const enquiries2 = await getCustomerEnquiries(
        req.dbUser.uid,
        req.supabaseAccessToken
      );
      res.json({
        user: {
          uid: req.dbUser.uid,
          email: req.dbUser.email,
          fullName: req.dbUser.fullName,
          phone: req.dbUser.phone,
          role: req.dbUser.role
        },
        enquiries: enquiries2
      });
    } catch (error) {
      sendSafeError(res, error, "Unable to load your profile.");
    }
  });
  app.put("/api/me", requireAuth, async (req, res) => {
    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
    const phone = typeof req.body?.phone === "string" ? req.body.phone.trim() : "";
    if (fullName.length < 2) {
      res.status(400).json({ error: "Please enter your full name." });
      return;
    }
    if (phone) {
      const phoneDigits = phone.replace(/[^\d]/g, "");
      if (phoneDigits.length < 8 || phoneDigits.length > 15) {
        res.status(400).json({ error: "Please enter a valid phone number." });
        return;
      }
    }
    try {
      const updated = await updateCustomerProfile(
        req.dbUser.uid,
        {
          fullName,
          phone
        },
        req.supabaseAccessToken
      );
      const finalUser = updated ? {
        uid: updated.uid,
        email: updated.email,
        fullName: updated.fullName,
        phone: updated.phone,
        role: updated.role,
        supabaseUserId: updated.supabaseUserId
      } : {
        uid: req.dbUser.uid,
        email: req.dbUser.email,
        fullName: fullName || null,
        phone: phone || null,
        role: req.dbUser.role,
        supabaseUserId: req.dbUser.supabaseUserId ?? null
      };
      const refreshedToken = createSignedSessionToken({
        uid: finalUser.uid,
        email: finalUser.email,
        role: finalUser.role,
        fullName: finalUser.fullName,
        phone: finalUser.phone,
        supabaseUserId: finalUser.supabaseUserId
      });
      res.json({
        token: refreshedToken,
        user: {
          uid: finalUser.uid,
          email: finalUser.email,
          fullName: finalUser.fullName,
          phone: finalUser.phone,
          role: finalUser.role
        }
      });
    } catch (error) {
      sendSafeError(res, error, "Unable to save profile details.");
    }
  });
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      const data = await getAdminCatalogueData(req.supabaseAccessToken);
      res.json(data);
    } catch (error) {
      sendSafeError(res, error, "Unable to load administrator dashboard.");
    }
  });
  app.get("/api/admin/supabase-status", requireAdmin, async (_req, res) => {
    try {
      const [diagnostics, unsynced, pgHealth] = await Promise.all([
        getSupabaseDiagnostics(),
        getUnsyncedEnquiries(),
        checkPostgresHealth()
      ]);
      res.json({
        diagnostics,
        pendingOrderSyncCount: unsynced.length,
        architecture: {
          runtime: process.env.VERCEL ? "vercel-serverless" : "node-server",
          primaryDatabase: pgHealth.configured ? "postgresql" : "supabase-cloud",
          postgresSource: pgHealth.source,
          postgresConnected: pgHealth.connected,
          mediaStorage: diagnostics.storageBucketReady ? "supabase-storage-cdn" : pgHealth.configured ? "postgresql-binary" : "inline-data-url",
          serviceRoleConfigured: diagnostics.serviceRoleConfigured,
          sessionSecretConfigured: isSessionSecretConfigured(),
          vercelReady: true
        }
      });
    } catch (error) {
      sendSafeError(res, error, "Unable to verify backend connection.");
    }
  });
  app.post("/api/admin/supabase-sync", requireAdmin, async (req, res) => {
    try {
      const diagnostics = await getSupabaseDiagnostics();
      if (!diagnostics.tablesReady) {
        res.status(400).json({
          error: "Supabase tables are not initialized yet. Copy and run the SQL setup script in your Supabase SQL Editor first, then click Verify & Sync.",
          diagnostics
        });
        return;
      }
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
        const resolvedUrls = [];
        for (const imgUrl of p.imageUrls ?? []) {
          const mediaMatch = /^\/api\/media\/(\d+)$/.exec(imgUrl.trim());
          if (mediaMatch) {
            const mediaAsset = await getMediaAssetRecord(Number(mediaMatch[1]));
            if (mediaAsset) {
              const uploaded = await uploadImageToSupabaseStorage({
                filename: mediaAsset.filename,
                mimeType: mediaAsset.mimeType,
                buffer: Buffer.from(mediaAsset.dataBase64, "base64"),
                accessToken: req.supabaseAccessToken
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
            isPublished: Boolean(p.isPublished && p.isActive)
          },
          req.supabaseAccessToken
        );
        if (ok) syncedProductsCount += 1;
      }
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
            createdAt: item.createdAt.toISOString()
          },
          req.supabaseAccessToken
        );
        if (result.synced) {
          await markEnquirySyncedToSupabase(item.id);
          syncedOrdersCount += 1;
        }
      }
      const allUsers = await getAllUsersForSync();
      let syncedUsersCount = 0;
      const sbClient = createPrivilegedSupabaseClient(req.supabaseAccessToken);
      for (const u of allUsers) {
        const insertRes = await sbClient.from("user_logins").insert({
          user_uid: u.supabaseUserId || u.uid,
          email: u.email,
          full_name: u.fullName,
          phone: u.phone,
          role: u.role === "admin" ? "admin" : "customer",
          auth_provider: "backfill",
          logged_in_at: u.updatedAt.toISOString()
        });
        if (!insertRes.error) {
          syncedUsersCount += 1;
        }
      }
      const [remaining, pgHealth] = await Promise.all([
        getUnsyncedEnquiries(),
        checkPostgresHealth()
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
          runtime: process.env.VERCEL ? "vercel-serverless" : "node-server",
          primaryDatabase: pgHealth.configured ? "postgresql" : "supabase-cloud",
          postgresSource: pgHealth.source,
          postgresConnected: pgHealth.connected,
          mediaStorage: diagnostics.storageBucketReady ? "supabase-storage-cdn" : pgHealth.configured ? "postgresql-binary" : "inline-data-url",
          serviceRoleConfigured: diagnostics.serviceRoleConfigured,
          sessionSecretConfigured: isSessionSecretConfigured(),
          vercelReady: true
        }
      });
    } catch (error) {
      sendSafeError(res, error, "Unable to sync records to Supabase.");
    }
  });
  app.get("/api/admin/products/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid product ID." });
      return;
    }
    try {
      const product = await getAdminProductById(id, req.supabaseAccessToken);
      if (!product) {
        res.status(404).json({ error: "Product not found." });
        return;
      }
      res.json({ product });
    } catch (error) {
      sendSafeError(res, error, "Unable to load product.");
    }
  });
  app.post("/api/admin/media", requireAdmin, async (req, res) => {
    const filename = typeof req.body?.filename === "string" && req.body.filename.trim() ? req.body.filename.trim().slice(0, 180) : "jewellery-image.jpg";
    const mimeType = typeof req.body?.mimeType === "string" ? req.body.mimeType.trim() : "";
    const rawBase64 = typeof req.body?.dataBase64 === "string" ? req.body.dataBase64.trim() : "";
    if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
      res.status(400).json({
        error: "Only JPG, PNG, and WebP jewellery images are supported."
      });
      return;
    }
    const strippedBase64 = rawBase64.replace(/^data:[^;]+;base64,/, "");
    if (!strippedBase64) {
      res.status(400).json({ error: "Image file data is empty." });
      return;
    }
    const buffer = Buffer.from(strippedBase64, "base64");
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      res.status(400).json({
        error: "Each uploaded image must be 4 MB or smaller."
      });
      return;
    }
    try {
      const sbUpload = await uploadImageToSupabaseStorage({
        filename,
        mimeType,
        buffer,
        accessToken: req.supabaseAccessToken
      });
      if (sbUpload.uploaded && sbUpload.publicUrl) {
        res.status(201).json({
          id: 0,
          storage: "supabase-storage",
          url: sbUpload.publicUrl
        });
        return;
      }
      if (hasPostgresConfig()) {
        const asset = await createMediaAssetRecord({
          filename,
          mimeType,
          dataBase64: strippedBase64,
          sizeBytes: buffer.length
        });
        res.status(201).json({
          id: asset.id,
          storage: "postgresql",
          url: `/api/media/${asset.id}`
        });
        return;
      }
      res.status(201).json({
        id: 0,
        storage: "inline",
        url: `data:${mimeType};base64,${strippedBase64}`
      });
    } catch (error) {
      sendSafeError(res, error, "Unable to upload image.");
    }
  });
  app.delete("/api/admin/media/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 0) {
      res.status(400).json({ error: "Invalid media ID." });
      return;
    }
    try {
      if (id > 0) {
        await deleteMediaAssetByIdIfUnused(id);
      }
      res.json({ ok: true });
    } catch (error) {
      sendSafeError(res, error, "Unable to clean up uploaded file.");
    }
  });
  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    const parsed = validateProductBody(req.body ?? {});
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    try {
      const created = await createProductRecord(parsed.value, req.supabaseAccessToken);
      res.status(201).json({ product: created });
    } catch (error) {
      sendSafeError(res, error, "Unable to create product.");
    }
  });
  app.put("/api/admin/products/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid product ID." });
      return;
    }
    const parsed = validateProductBody(req.body ?? {});
    if ("error" in parsed) {
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
      const status = error instanceof Error && error.message === "Product not found." ? 404 : 500;
      sendSafeError(res, error, "Unable to update product.", status);
    }
  });
  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid product ID." });
      return;
    }
    try {
      await deleteProductRecord(id, req.supabaseAccessToken);
      res.json({ ok: true });
    } catch (error) {
      const status = error instanceof Error && error.message === "Product not found." ? 404 : 500;
      sendSafeError(res, error, "Unable to delete product.", status);
    }
  });
  app.post("/api/admin/categories", requireAdmin, async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: "Category name must be between 2 and 80 characters." });
      return;
    }
    try {
      const category = await createCategoryRecord(name, req.supabaseAccessToken);
      res.status(201).json({ category });
    } catch (error) {
      sendSafeError(res, error, "Unable to create category.", 400);
    }
  });
  app.put("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    if (!Number.isInteger(id) || id <= 0 || name.length < 2 || name.length > 80) {
      res.status(400).json({
        error: "Valid category ID and name (2\u201380 characters) are required."
      });
      return;
    }
    try {
      const category = await updateCategoryRecord(id, name, req.supabaseAccessToken);
      res.json({ category });
    } catch (error) {
      sendSafeError(res, error, "Unable to rename category.", 400);
    }
  });
  app.post(
    "/api/admin/categories/:id/reassign",
    requireAdmin,
    async (req, res) => {
      const fromId = Number(req.params.id);
      const toId = Number(req.body?.targetCategoryId);
      if (!Number.isInteger(fromId) || fromId <= 0 || !Number.isInteger(toId) || toId <= 0) {
        res.status(400).json({ error: "Valid source and destination categories are required." });
        return;
      }
      try {
        await reassignCategoryProductsRecord(fromId, toId, req.supabaseAccessToken);
        res.json({ ok: true });
      } catch (error) {
        sendSafeError(res, error, "Unable to reassign products.", 400);
      }
    }
  );
  app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid category ID." });
      return;
    }
    try {
      await deleteCategoryRecord(id, req.supabaseAccessToken);
      res.json({ ok: true });
    } catch (error) {
      const isConflict = error instanceof Error && error.message.startsWith("Cannot delete this category");
      sendSafeError(
        res,
        error,
        "Unable to delete category.",
        isConflict ? 400 : 500
      );
    }
  });
  app.patch("/api/admin/enquiries/:id", requireAdmin, async (req, res) => {
    const id = Number(req.params.id);
    const status = typeof req.body?.status === "string" ? req.body.status.trim() : "";
    if (!Number.isInteger(id) || id <= 0 || !ALLOWED_ENQUIRY_STATUS.has(status)) {
      res.status(400).json({ error: "Valid enquiry ID and status are required." });
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
      sendSafeError(res, error, "Unable to update enquiry status.");
    }
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API endpoint not found." });
  });
  return app;
}
var apiApp = createApiApp();
var app_default = apiApp;
export {
  apiApp,
  createApiApp,
  app_default as default,
  ensureBackendInitialized
};
