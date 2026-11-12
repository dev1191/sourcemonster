import { db } from "../lib/db";
import { faqs, type FAQ, type NewFAQ } from "../lib/db/schema";
import { eq, asc, desc, and, or, ilike, count } from "drizzle-orm";
import type { FAQInput } from "../lib/validation/faq";

export interface GetAllAdminFaqsOptions {
  category?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}

export type PaginatedFaqsResult = FAQ[] & {
  items: FAQ[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getAllAdminFaqs(
  categoryOrOptions?: string | GetAllAdminFaqsOptions,
  paginationOptions?: { page?: number; pageSize?: number; search?: string }
): Promise<PaginatedFaqsResult> {
  let category = "";
  let page = 1;
  let pageSize = 10;
  let search = "";

  if (typeof categoryOrOptions === "string") {
    category = categoryOrOptions;
    if (paginationOptions) {
      if (paginationOptions.page) page = paginationOptions.page;
      if (paginationOptions.pageSize) pageSize = paginationOptions.pageSize;
      if (paginationOptions.search) search = paginationOptions.search;
    }
  } else if (categoryOrOptions && typeof categoryOrOptions === "object") {
    if (categoryOrOptions.category) category = categoryOrOptions.category;
    if (categoryOrOptions.page) page = categoryOrOptions.page;
    if (categoryOrOptions.pageSize) pageSize = categoryOrOptions.pageSize;
    if (categoryOrOptions.search) search = categoryOrOptions.search;
  }

  page = Math.max(1, Number(page) || 1);
  pageSize = Math.max(1, Number(pageSize) || 10);

  const conditions = [];

  if (category && category.trim() !== "") {
    conditions.push(eq(faqs.category, category.trim()));
  }

  if (search && search.trim() !== "") {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(faqs.question, term),
        ilike(faqs.answer, term)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Total count query
  const countQuery = db.select({ value: count() }).from(faqs);
  const [{ value: totalCount }] = whereClause
    ? await countQuery.where(whereClause)
    : await countQuery;

  const total = Number(totalCount) || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const offset = (page - 1) * pageSize;

  // Items query
  const itemsQuery = db.select().from(faqs);
  const items = await (whereClause ? itemsQuery.where(whereClause) : itemsQuery)
    .orderBy(asc(faqs.sortOrder), desc(faqs.createdAt))
    .limit(pageSize)
    .offset(offset);

  const result = [...items] as PaginatedFaqsResult;
  result.items = items;
  result.total = total;
  result.page = page;
  result.pageSize = pageSize;
  result.totalPages = totalPages;

  return result;
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

