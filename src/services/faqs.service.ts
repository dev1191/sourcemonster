import { db } from "../lib/db";
import { faqs, type FAQ, type NewFAQ } from "../lib/db/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import type { FAQInput } from "../lib/validation/faq";

export async function getAllAdminFaqs(categoryFilter?: string): Promise<FAQ[]> {
  const query = db.select().from(faqs);
  if (categoryFilter && categoryFilter.trim() !== "") {
    return query
      .where(eq(faqs.category, categoryFilter.trim()))
      .orderBy(asc(faqs.sortOrder), desc(faqs.createdAt));
  }
  return query.orderBy(asc(faqs.sortOrder), desc(faqs.createdAt));
}

export async function getPublishedFaqs(categoryFilter?: string): Promise<FAQ[]> {
  const query = db.select().from(faqs);
  if (categoryFilter && categoryFilter.trim() !== "") {
    return query
      .where(and(eq(faqs.isPublished, true), eq(faqs.category, categoryFilter.trim())))
      .orderBy(asc(faqs.sortOrder), desc(faqs.createdAt));
  }
  return query
    .where(eq(faqs.isPublished, true))
    .orderBy(asc(faqs.sortOrder), desc(faqs.createdAt));
}

export async function getFaqById(id: string): Promise<FAQ | null> {
  const [record] = await db.select().from(faqs).where(eq(faqs.id, id)).limit(1);
  return record || null;
}

export async function getFaqCategories(): Promise<string[]> {
  const records = await db
    .select({ category: faqs.category })
    .from(faqs)
    .groupBy(faqs.category);

  const categories = records.map((r) => r.category).filter(Boolean);
  return Array.from(new Set(["General", "Projects", "Services", "Licensing", "Customization", ...categories]));
}

export async function createFaq(input: FAQInput): Promise<FAQ> {
  const question = input.question.trim();
  const answer = input.answer.trim();
  const category = input.category.trim() || "General";

  if (!question || !answer) {
    throw new Error("Question and Answer are required.");
  }

  const [created] = await db
    .insert(faqs)
    .values({
      question,
      answer,
      category,
      sortOrder: input.sortOrder ?? 0,
      isPublished: input.isPublished ?? true,
    })
    .returning();

  return created;
}

export async function updateFaq(id: string, input: FAQInput): Promise<FAQ> {
  const question = input.question.trim();
  const answer = input.answer.trim();
  const category = input.category.trim() || "General";

  if (!question || !answer) {
    throw new Error("Question and Answer are required.");
  }

  const [updated] = await db
    .update(faqs)
    .set({
      question,
      answer,
      category,
      sortOrder: input.sortOrder ?? 0,
      isPublished: input.isPublished ?? true,
      updatedAt: new Date(),
    })
    .where(eq(faqs.id, id))
    .returning();

  if (!updated) {
    throw new Error(`FAQ with ID ${id} not found.`);
  }

  return updated;
}

export async function deleteFaq(id: string): Promise<void> {
  await db.delete(faqs).where(eq(faqs.id, id));
}

export async function toggleFaqPublished(id: string): Promise<FAQ> {
  const existing = await getFaqById(id);
  if (!existing) {
    throw new Error(`FAQ with ID ${id} not found.`);
  }

  const [updated] = await db
    .update(faqs)
    .set({
      isPublished: !existing.isPublished,
      updatedAt: new Date(),
    })
    .where(eq(faqs.id, id))
    .returning();

  return updated;
}

