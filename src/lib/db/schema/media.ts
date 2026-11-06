import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  disk: varchar("disk", { length: 20 }).notNull().default("local"),
  objectKey: text("object_key").notNull().unique(),
  originalName: text("original_name").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  altText: text("alt_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;

