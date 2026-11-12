ALTER TABLE "products" RENAME TO "projects";--> statement-breakpoint
ALTER TABLE "product_media" RENAME TO "project_media";--> statement-breakpoint
ALTER TABLE "product_change_logs" RENAME TO "project_change_logs";--> statement-breakpoint
ALTER TABLE "product_addons" RENAME TO "project_addons";--> statement-breakpoint
ALTER TABLE "product_addon_media" RENAME TO "project_addon_media";--> statement-breakpoint
ALTER TABLE "product_addon_change_logs" RENAME TO "project_addon_change_logs";--> statement-breakpoint
ALTER TABLE "project_media" RENAME COLUMN "product_id" TO "project_id";--> statement-breakpoint
ALTER TABLE "project_change_logs" RENAME COLUMN "product_id" TO "project_id";--> statement-breakpoint
ALTER TABLE "project_addons" RENAME COLUMN "product_id" TO "project_id";--> statement-breakpoint
ALTER TABLE "leads" RENAME COLUMN "product_id" TO "project_id";

