import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  company: text("company"),
  subject: text("subject"),
  message: text("message").notNull(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  serviceId: text("service_id"),
  budget: varchar("budget", { length: 100 }),
  sourcePage: text("source_page"),
  status: varchar("status", { length: 50 }).notNull().default("new"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

