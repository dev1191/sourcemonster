import { db } from "../lib/db";
import { services, type Service } from "../lib/db/schema";
import { eq, desc } from "drizzle-orm";

export interface ServiceInput {
  title: string;
  slug: string;
  description: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
  status?: "published" | "draft";
}

export async function getAllServices(options?: { onlyPublished?: boolean }): Promise<Service[]> {
  const query = db.select().from(services);
  if (options?.onlyPublished) {
    return query
      .where(eq(services.status, "published"))
      .orderBy(desc(services.sortOrder), desc(services.createdAt));
  }
  return query.orderBy(desc(services.sortOrder), desc(services.createdAt));
}

export async function getServiceById(id: string): Promise<Service | null> {
  const [record] = await db
    .select()
    .from(services)
    .where(eq(services.id, id))
    .limit(1);
  return record || null;
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const [record] = await db
    .select()
    .from(services)
    .where(eq(services.slug, slug))
    .limit(1);
  return record || null;
}

export async function createService(input: ServiceInput): Promise<Service> {
  const title = input.title.trim();
  const slug = input.slug.trim().toLowerCase();
  const description = input.description.trim();

  if (!title || !slug || !description) {
    throw new Error("Title, slug, and description are required.");
  }

  const [existing] = await db
    .select()
    .from(services)
    .where(eq(services.slug, slug))
    .limit(1);

  if (existing) {
    throw new Error(`A service with slug "${slug}" already exists.`);
  }

  const [created] = await db
    .insert(services)
    .values({
      title,
      slug,
      description,
      icon: input.icon?.trim() || "code",
      color: input.color?.trim() || "primary",
      sortOrder: input.sortOrder ?? 0,
      status: input.status || "published",
    })
    .returning();

  return created;
}

export async function updateService(id: string, input: ServiceInput): Promise<Service> {
  const title = input.title.trim();
  const slug = input.slug.trim().toLowerCase();
  const description = input.description.trim();

  if (!title || !slug || !description) {
    throw new Error("Title, slug, and description are required.");
  }

  const [existing] = await db
    .select()
    .from(services)
    .where(eq(services.slug, slug))
    .limit(1);

  if (existing && existing.id !== id) {
    throw new Error(`The slug "${slug}" is already in use by another service.`);
  }

  const [updated] = await db
    .update(services)
    .set({
      title,
      slug,
      description,
      icon: input.icon?.trim() || "code",
      color: input.color?.trim() || "primary",
      sortOrder: input.sortOrder ?? 0,
      status: input.status || "published",
      updatedAt: new Date(),
    })
    .where(eq(services.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Service with ID "${id}" not found.`);
  }

  return updated;
}

export async function deleteService(id: string): Promise<boolean> {
  const deleted = await db.delete(services).where(eq(services.id, id)).returning();
  return deleted.length > 0;
}
