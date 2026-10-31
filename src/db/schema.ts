import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  uid: text('uid').primaryKey(), // Auth UID (Supabase / Server / Firebase)
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  supabaseUserId: text('supabase_user_id'),
  fullName: text('full_name'),
  phone: text('phone'),
  role: text('role').notNull().default('customer'), // 'customer' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id')
      .references(() => categories.id)
      .notNull(),
    title: text('title').notNull().default(''),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description').notNull(),
    priceInr: integer('price_inr').notNull(),
    sku: text('sku'),
    imageUrls: jsonb('image_urls').$type<string[]>().notNull().default([]),
    finish: text('finish'),
    sizes: jsonb('sizes').$type<string[]>().notNull().default([]),
    availabilityStatus: text('availability_status').notNull().default('available'),
    isPublished: boolean('is_published').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    isFeatured: boolean('is_featured').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('products_category_id_idx').on(table.categoryId),
    index('products_is_published_idx').on(table.isPublished),
    index('products_availability_status_idx').on(table.availabilityStatus),
  ]
);

export const enquiries = pgTable('enquiries', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').references(() => users.uid),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  productName: text('product_name').notNull(),
  productPriceInr: integer('product_price_inr'),
  productSku: text('product_sku'),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  customerEmail: text('customer_email').notNull(),
  preferredSize: text('preferred_size'),
  notes: text('notes'),
  status: text('status').notNull().default('new'), // 'new' | 'contacted' | 'completed'
  supabaseSynced: boolean('supabase_synced').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mediaAssets = pgTable('media_assets', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  dataBase64: text('data_base64').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  enquiries: many(enquiries),
}));

export const usersRelations = relations(users, ({ many }) => ({
  enquiries: many(enquiries),
}));

export const enquiriesRelations = relations(enquiries, ({ one }) => ({
  user: one(users, {
    fields: [enquiries.userUid],
    references: [users.uid],
  }),
  product: one(products, {
    fields: [enquiries.productId],
    references: [products.id],
  }),
}));
