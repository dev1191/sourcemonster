import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { projects, services, testimonials, faqs } from "../../src/lib/db/schema";
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

  // 4. Seed FAQs
  await seedFaqs(options);

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

async function seedFaqs(options: { force?: boolean }) {
  const defaultFaqs = [
    {
      question: "What types of software projects does SourceMonster provide?",
      answer: "We engineer production-grade commercial software products including complete multi-vendor SaaS boilerplates, delivery & logistics systems, AI management platforms, CRM solutions, and full-stack web applications. Each project comes with thoroughly documented source code, database schemas, and deployment guides.",
      category: "Projects",
      sortOrder: 1,
    },
    {
      question: "Do I get full access to the source code?",
      answer: "Yes, 100%. When you purchase our commercial projects or hire our custom development services, you receive full, unencrypted source code (frontend, backend, database migrations, and Docker configurations). There are no obfuscated modules or hidden dependencies.",
      category: "Licensing",
      sortOrder: 2,
    },
    {
      question: "Can SourceMonster customize a project for my business requirements?",
      answer: "Absolutely. In addition to our pre-built commercial software, our engineering team specializes in custom software development, third-party API integrations, payment gateway setups, design overhauls, and bespoke business features tailored to your specific workflows.",
      category: "Customization",
      sortOrder: 3,
    },
    {
      question: "How do updates and support work for purchased projects?",
      answer: "All our commercial projects receive ongoing maintenance, bug fixes, and security patches. You can review detailed version changelogs on each project's page. We also offer dedicated technical support, documentation assistance, and custom SLA agreements.",
      category: "Support",
      sortOrder: 4,
    },
    {
      question: "What tech stack is used across your commercial platforms?",
      answer: "We build with modern, high-performance technologies including Astro, Next.js, React, Node.js, TypeScript, PostgreSQL, Drizzle ORM, Docker, and Tailwind CSS. All platforms are architected for sub-second response times, rock-solid security, and scalable cloud deployments.",
      category: "General",
      sortOrder: 5,
    },
    {
      question: "How quickly can a project be deployed to my production server?",
      answer: "Because our projects include production-ready Docker Compose configurations and automated deployment scripts, typical deployment to a VPS (such as DigitalOcean, AWS, or Hetzner) takes under 30 minutes with our step-by-step documentation.",
      category: "Projects",
      sortOrder: 6,
    },
  ];

  try {
    let count = 0;
    for (const item of defaultFaqs) {
      const [existing] = await db
        .select()
        .from(faqs)
        .where(eq(faqs.question, item.question))
        .limit(1);

      if (existing) {
        if (!options.force) continue;
        await db
          .update(faqs)
          .set({
            answer: item.answer,
            category: item.category,
            sortOrder: item.sortOrder,
            isPublished: true,
            updatedAt: new Date(),
          })
          .where(eq(faqs.id, existing.id));
        count++;
        continue;
      }

      await db.insert(faqs).values({
        question: item.question,
        answer: item.answer,
        category: item.category,
        sortOrder: item.sortOrder,
        isPublished: true,
      });
      count++;
    }
    console.log(`✅ FAQs: ${count} default FAQs upserted.`);
  } catch (err) {
    console.warn("⚠️ Could not seed FAQs:", err);
  }
}

