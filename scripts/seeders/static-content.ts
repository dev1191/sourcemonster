import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { products } from "../../src/lib/db/schema";
import { productSchema } from "../../src/lib/validation/product";

export async function seedStaticContent(options: { force?: boolean } = {}) {
  const dataPath = path.join(__dirname, "data", "products.json");

  try {
    const rawData = await fs.readFile(dataPath, "utf-8");
    const rawProducts = JSON.parse(rawData);

    if (!Array.isArray(rawProducts)) {
      throw new Error("products.json must contain an array of products");
    }

    console.log(`📦 Found ${rawProducts.length} default products to seed...`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const rawProduct of rawProducts) {
      const parseResult = productSchema.safeParse(rawProduct);
      if (!parseResult.success) {
        console.error(`❌ Validation failed for product "${rawProduct.title}":`, parseResult.error.flatten());
        continue;
      }

      const valid = parseResult.data;

      // Check if product with slug already exists
      const [existing] = await db
        .select()
        .from(products)
        .where(eq(products.slug, valid.slug))
        .limit(1);

      if (existing) {
        if (!options.force) {
          console.log(`ℹ️  Product [${valid.slug}] already exists. Skipping.`);
          skippedCount++;
          continue;
        }

        console.log(`🔄 Updating existing product [${valid.slug}] (--force)...`);
        await db
          .update(products)
          .set({
            title: valid.title,
            shortDescription: valid.shortDescription,
            description: valid.description,
            codecanyonUrl: valid.codecanyonUrl || null,
            demoUrl: valid.demoUrl || null,
            documentationUrl: valid.documentationUrl || null,
            version: valid.version || null,
            technologies: valid.technologies,
            features: valid.features,
            status: valid.status,
            isFeatured: valid.isFeatured,
            sortOrder: valid.sortOrder,
            seoTitle: valid.seoTitle || null,
            seoDescription: valid.seoDescription || null,
            publishedAt: valid.status === "published" ? new Date() : null,
            updatedAt: new Date(),
          })
          .where(eq(products.id, existing.id));

        createdCount++;
        continue;
      }

      console.log(`🌱 Inserting product: ${valid.title} (${valid.slug})...`);
      await db.insert(products).values({
        title: valid.title,
        slug: valid.slug,
        shortDescription: valid.shortDescription,
        description: valid.description,
        codecanyonUrl: valid.codecanyonUrl || null,
        demoUrl: valid.demoUrl || null,
        documentationUrl: valid.documentationUrl || null,
        version: valid.version || null,
        technologies: valid.technologies,
        features: valid.features,
        status: valid.status,
        isFeatured: valid.isFeatured,
        sortOrder: valid.sortOrder,
        seoTitle: valid.seoTitle || null,
        seoDescription: valid.seoDescription || null,
        publishedAt: valid.status === "published" ? new Date() : null,
      });

      createdCount++;
    }

    console.log(`✅ Products seed finished: ${createdCount} created/updated, ${skippedCount} skipped.`);
  } catch (error) {
    console.error("❌ Failed to seed static products:", error);
    throw error;
  }
}

