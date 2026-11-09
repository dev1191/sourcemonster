ALTER TABLE "products" ALTER COLUMN "features" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "features" SET DATA TYPE text USING features::text;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "features" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "product_addon_change_logs" ADD COLUMN IF NOT EXISTS "version" varchar(50);--> statement-breakpoint
ALTER TABLE "product_change_logs" ADD COLUMN IF NOT EXISTS "version" varchar(50);
