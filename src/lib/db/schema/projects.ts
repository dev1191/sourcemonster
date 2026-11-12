import { pgTable, uuid, varchar, text, boolean, integer, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { media } from "./media";

export const projects = pgTable("projects", {
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
  features: text("features"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMedia = pgTable("project_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectChangeLog = pgTable("project_change_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 50 }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMedia = typeof projectMedia.$inferSelect;
export type ProjectChangeLog = typeof projectChangeLog.$inferSelect;
export type NewProjectChangeLog = typeof projectChangeLog.$inferInsert;
export type NewProjectMedia = typeof projectMedia.$inferInsert;

// ── Project Add-ons / Modules ────────────────────────────────────────────────
// Optional separately-purchasable or free modules that belong to a project.
export const projectAddons = pgTable("project_addons", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
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

export const projectAddonMedia = pgTable("project_addon_media", {
  id: uuid("id").primaryKey().defaultRandom(),
  addonId: uuid("addon_id")
    .notNull()
    .references(() => projectAddons.id, { onDelete: "cascade" }),
  mediaId: uuid("media_id")
    .notNull()
    .references(() => media.id, { onDelete: "cascade" }),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectAddonChangeLog = pgTable("project_addon_change_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  addonId: uuid("addon_id")
    .notNull()
    .references(() => projectAddons.id, { onDelete: "cascade" }),
  version: varchar("version", { length: 50 }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectAddon = typeof projectAddons.$inferSelect;
export type NewProjectAddon = typeof projectAddons.$inferInsert;
export type ProjectAddonMedia = typeof projectAddonMedia.$inferSelect;
export type ProjectAddonChangeLog = typeof projectAddonChangeLog.$inferSelect;
export type NewProjectAddonChangeLog = typeof projectAddonChangeLog.$inferInsert;
export type NewProjectAddonMedia = typeof projectAddonMedia.$inferInsert;

// Aliases for seamless backward compatibility during transition
export const products = projects;
export const productMedia = projectMedia;
export const productChangeLog = projectChangeLog;
export const productAddons = projectAddons;
export const productAddonMedia = projectAddonMedia;
export const productAddonChangeLog = projectAddonChangeLog;

export type Product = Project;
export type NewProduct = NewProject;
export type ProductMedia = ProjectMedia;
export type ProductChangeLog = ProjectChangeLog;
export type NewProductChangeLog = NewProjectChangeLog;
export type NewProductMedia = NewProjectMedia;
export type ProductAddon = ProjectAddon;
export type NewProductAddon = NewProjectAddon;
export type ProductAddonMedia = ProjectAddonMedia;
export type ProductAddonChangeLog = ProjectAddonChangeLog;
export type NewProductAddonChangeLog = NewProjectAddonChangeLog;
export type NewProductAddonMedia = NewProjectAddonMedia;

