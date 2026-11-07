import { db } from "../lib/db";
import { testimonials, type Testimonial, type NewTestimonial } from "../lib/db/schema";
import { eq, desc } from "drizzle-orm";

export interface TestimonialInput {
  name: string;
  role: string;
  quote: string;
  color?: string;
  sortOrder?: number;
  status?: "published" | "draft";
}

export async function getAllTestimonials(options?: { onlyPublished?: boolean }): Promise<Testimonial[]> {
  const query = db.select().from(testimonials);
  if (options?.onlyPublished) {
    return query
      .where(eq(testimonials.status, "published"))
      .orderBy(desc(testimonials.sortOrder), desc(testimonials.createdAt));
  }
  return query.orderBy(desc(testimonials.sortOrder), desc(testimonials.createdAt));
}

export async function getTestimonialById(id: string): Promise<Testimonial | null> {
  const [record] = await db
    .select()
    .from(testimonials)
    .where(eq(testimonials.id, id))
    .limit(1);
  return record || null;
}

export async function createTestimonial(input: TestimonialInput): Promise<Testimonial> {
  const name = input.name.trim();
  const role = input.role.trim();
  const quote = input.quote.trim();

  if (!name || !role || !quote) {
    throw new Error("Client name, role, and quote are required.");
  }

  const [created] = await db
    .insert(testimonials)
    .values({
      name,
      role,
      quote,
      color: input.color?.trim() || "primary",
      sortOrder: input.sortOrder ?? 0,
      status: input.status || "published",
    })
    .returning();

  return created;
}

export async function updateTestimonial(id: string, input: TestimonialInput): Promise<Testimonial> {
  const name = input.name.trim();
  const role = input.role.trim();
  const quote = input.quote.trim();

  if (!name || !role || !quote) {
    throw new Error("Client name, role, and quote are required.");
  }

  const [updated] = await db
    .update(testimonials)
    .set({
      name,
      role,
      quote,
      color: input.color?.trim() || "primary",
      sortOrder: input.sortOrder ?? 0,
      status: input.status || "published",
      updatedAt: new Date(),
    })
    .where(eq(testimonials.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Testimonial with ID "${id}" not found.`);
  }

  return updated;
}

export async function deleteTestimonial(id: string): Promise<boolean> {
  const deleted = await db.delete(testimonials).where(eq(testimonials.id, id)).returning();
  return deleted.length > 0;
}

