import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { projects, services, testimonials } from "../../src/lib/db/schema";
import { projectSchema } from "../../src/lib/validation/project";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function seedStaticContent(options: { force?: boolean } = {}) {
  console.log("📦 Starting static content migration to database...");

  // 1. Seed Projects
  await seedProjects(options);

  // 2. Seed Services from src/content/services/
  await seedServices(options);

  // 3. Seed Testimonials from src/content/testimonials/
  await seedTestimonials(options);

  console.log("🎉 All static content migration finished!");
}

async function seedProjects(options: { force?: boolean }) {
  let dataPath = path.join(__dirname, "data", "projects.json");
  try {
    await fs.access(dataPath);
  } catch {
    dataPath = path.join(__dirname, "data", "products.json");
  }

  try {
    const rawData = await fs.readFile(dataPath, "utf-8");
    const rawProjects = JSON.parse(rawData);

    if (!Array.isArray(rawProjects)) return;
    console.log(`\n📦 Checking ${rawProjects.length} default projects...`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const rawProject of rawProjects) {
      const parseResult = projectSchema.safeParse(rawProject);
      if (!parseResult.success) continue;

      const valid = parseResult.data;
      const [existing] = await db
        .select()
        .from(projects)
        .where(eq(projects.slug, valid.slug))
        .limit(1);

      if (existing) {
        if (!options.force) {
          skippedCount++;
          continue;
        }
        await db
          .update(projects)
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
          .where(eq(projects.id, existing.id));
        createdCount++;
        continue;
      }

      await db.insert(projects).values({
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

    console.log(`✅ Projects: ${createdCount} upserted, ${skippedCount} skipped.`);
  } catch (error) {
    console.error("❌ Failed to seed projects:", error);
  }
}

async function seedServices(options: { force?: boolean }) {
  const servicesDir = path.join(process.cwd(), "src", "content", "services");

  try {
    const files = await fs.readdir(servicesDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    console.log(`\n📦 Found ${jsonFiles.length} services to migrate from ${servicesDir}...`);

    let count = 0;
    let order = 1;

    for (const file of jsonFiles) {
      const slug = path.basename(file, ".json");
      const content = JSON.parse(await fs.readFile(path.join(servicesDir, file), "utf-8"));

      const [existing] = await db
        .select()
        .from(services)
        .where(eq(services.slug, slug))
        .limit(1);

      if (existing) {
        if (!options.force) continue;
        await db
          .update(services)
          .set({
            title: content.title,
            description: content.description,
            icon: content.icon || "code",
            color: content.color || "primary",
            delay: content.delay || 0,
            sortOrder: order++,
            updatedAt: new Date(),
          })
          .where(eq(services.id, existing.id));
        count++;
        continue;
      }

      await db.insert(services).values({
        title: content.title,
        slug,
        description: content.description,
        icon: content.icon || "code",
        color: content.color || "primary",
        delay: content.delay || 0,
        sortOrder: order++,
        status: "published",
      });
      count++;
    }

    console.log(`✅ Services: ${count} imported into database.`);
  } catch (err) {
    console.warn("⚠️ Could not read services directory:", err);
  }
}

async function seedTestimonials(options: { force?: boolean }) {
  const testimonialsDir = path.join(process.cwd(), "src", "content", "testimonials");

  try {
    const files = await fs.readdir(testimonialsDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    console.log(`\n📦 Found ${jsonFiles.length} testimonials to migrate from ${testimonialsDir}...`);

    let count = 0;
    let order = 1;

    for (const file of jsonFiles) {
      const content = JSON.parse(await fs.readFile(path.join(testimonialsDir, file), "utf-8"));

      const [existing] = await db
        .select()
        .from(testimonials)
        .where(eq(testimonials.name, content.name))
        .limit(1);

      if (existing) {
        if (!options.force) continue;
        await db
          .update(testimonials)
          .set({
            role: content.role,
            quote: content.quote,
            color: content.color || "primary",
            delay: content.delay || 0,
            sortOrder: order++,
            updatedAt: new Date(),
          })
          .where(eq(testimonials.id, existing.id));
        count++;
        continue;
      }

      await db.insert(testimonials).values({
        name: content.name,
        role: content.role,
        quote: content.quote,
        color: content.color || "primary",
        delay: content.delay || 0,
        sortOrder: order++,
        status: "published",
      });
      count++;
    }

    console.log(`✅ Testimonials: ${count} imported into database.`);
  } catch (err) {
    console.warn("⚠️ Could not read testimonials directory:", err);
  }
}
