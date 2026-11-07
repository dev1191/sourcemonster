ALTER TABLE "product_addons" ADD COLUMN IF NOT EXISTS "thumbnail_media_id" uuid;

DO $$ BEGIN
  ALTER TABLE "product_addons" ADD CONSTRAINT "product_addons_thumbnail_media_id_fkey" FOREIGN KEY ("thumbnail_media_id") REFERENCES "media"("id") ON DELETE set null;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "product_addon_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"addon_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"caption" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_addon_media_addon_id_fkey" FOREIGN KEY ("addon_id") REFERENCES "product_addons"("id") ON DELETE cascade,
	CONSTRAINT "product_addon_media_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media"("id") ON DELETE cascade
);
