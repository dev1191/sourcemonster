import { db } from "../lib/db";
import { leads, type Lead, type NewLead } from "../lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { leadStatusSchema, type LeadStatus } from "../lib/validation/lead";

export interface LeadFilterOptions {
  status?: string;
  searchQuery?: string;
}

export interface CaptureLeadInput {
  name: string;
  email: string;
  message: string;
  company?: string | null;
  service?: string | null;
  projectId?: string | null;
  productId?: string | null;
  budget?: string | null;
  sourcePage?: string | null;
}

export interface UpdateLeadInput {
  status: LeadStatus;
  adminNotes?: string | null;
}

export async function getAllLeads(filter?: LeadFilterOptions): Promise<Lead[]> {
  const conditions = [];

  if (filter?.status && filter.status !== "all") {
    conditions.push(eq(leads.status, filter.status));
  }

  if (filter?.searchQuery && filter.searchQuery.trim() !== "") {
    const pattern = `%${filter.searchQuery.trim()}%`;
    conditions.push(
      sql`(${leads.name} ILIKE ${pattern} OR ${leads.email} ILIKE ${pattern} OR ${leads.company} ILIKE ${pattern})`
    );
  }

  return db
    .select()
    .from(leads)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const [record] = await db
    .select()
    .from(leads)
    .where(eq(leads.id, id))
    .limit(1);
  return record || null;
}

export async function captureLead(input: CaptureLeadInput): Promise<Lead> {
  const [savedLead] = await db
    .insert(leads)
    .values({
      name: input.name,
      email: input.email,
      company: input.company || null,
      subject: input.service || "New Inquiry",
      serviceId: input.service || null,
      projectId: input.projectId || input.productId || null,
      budget: input.budget || null,
      message: input.message,
      sourcePage: input.sourcePage || "/",
      status: "new",
    })
    .returning();

  return savedLead;
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<Lead> {
  const parsedStatus = leadStatusSchema.safeParse(input.status);
  if (!parsedStatus.success) {
    throw new Error("Invalid lead status provided.");
  }

  const [updated] = await db
    .update(leads)
    .set({
      status: parsedStatus.data,
      adminNotes: input.adminNotes !== undefined ? input.adminNotes : undefined,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id))
    .returning();

  if (!updated) {
    throw new Error(`Lead with ID "${id}" not found.`);
  }

  return updated;
}

export async function deleteLead(id: string): Promise<boolean> {
  const deleted = await db.delete(leads).where(eq(leads.id, id)).returning();
  return deleted.length > 0;
}

