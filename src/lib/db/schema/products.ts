import { pgTable, uuid, varchar, text, boolean, integer, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { media } from "./media";

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),
  thumbnailMediaId: uuid("thumbnail_media_id").references(() => media.id, { onDelete: "set null" }),
  codecanyonUrl: text("codecanyon_url"),
  demoUrl: text("demo_url"),
  documentationUrl: text("documentation_url"),
  version: varchar("version", { length: 50 }),
  technologies: jsonb("technologies").$type<string[]>().notNull().default([]),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productMedia = pgTable("product_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productChangeLog = pgTable("product_change_logs",{
  id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
    content:text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})


export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type ProductMedia = typeof productMedia.$inferSelect;
export type ProdChangeLog = typeof productChangeLog.$inferSelect;
export type NewProductMedia = typeof productMedia.$inferInsert;

// ── Product Add-ons / Modules ────────────────────────────────────────────────
// Optional separately-purchasable or free modules that belong to a product.
export const productAddons = pgTable("product_addons", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  thumbnailMediaId: uuid("thumbnail_media_id").references(() => media.id, { onDelete: "set null" }),
  /** Decimal price in USD. NULL means free or contact-for-price. */
  price: numeric("price", { precision: 10, scale: 2 }),
  /** If true the addon is free. Overrides price display. */
  isFree: boolean("is_free").notNull().default(false),
  /** External buy link (e.g. CodeCanyon, Gumroad). */
  buyUrl: text("buy_url"),
  /** Live-demo / preview link. */
  demoUrl: text("demo_url"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const productAddonMedia = pgTable("product_addon_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  addonId: uuid("addon_id")
    .notNull()
    .references(() => productAddons.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});



export type ProductAddon = typeof productAddons.$inferSelect;
export type NewProductAddon = typeof productAddons.$inferInsert;
export type ProductAddonMedia = typeof productAddonMedia.$inferSelect;
export type NewProductAddonMedia = typeof productAddonMedia.$inferInsert;

