import { db } from "../lib/db";
import { projects, leads } from "../lib/db/schema";
import { desc, eq, count } from "drizzle-orm";

export interface DashboardMetrics {
  totalProjectsCount: number;
  publishedProjectsCount: number;
  totalProductsCount: number;
  publishedProductsCount: number;
  totalLeadsCount: number;
  newLeadsCount: number;
  recentProjects: Array<typeof projects.$inferSelect>;
  recentProducts: Array<typeof projects.$inferSelect>;
  recentLeads: Array<typeof leads.$inferSelect>;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const [projectsCountRes] = await db.select({ value: count() }).from(projects);
    const totalProjectsCount = projectsCountRes?.value ?? 0;

    const [publishedRes] = await db
      .select({ value: count() })
      .from(projects)
      .where(eq(projects.status, "published"));
    const publishedProjectsCount = publishedRes?.value ?? 0;

    const [leadsCountRes] = await db.select({ value: count() }).from(leads);
    const totalLeadsCount = leadsCountRes?.value ?? 0;

    const [newLeadsRes] = await db
      .select({ value: count() })
      .from(leads)
      .where(eq(leads.status, "new"));
    const newLeadsCount = newLeadsRes?.value ?? 0;

    const recentProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt))
      .limit(5);

    const recentLeads = await db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(5);

    return {
      totalProjectsCount,
      publishedProjectsCount,
      totalProductsCount: totalProjectsCount,
      publishedProductsCount: publishedProjectsCount,
      totalLeadsCount,
      newLeadsCount,
      recentProjects,
      recentProducts: recentProjects,
      recentLeads,
    };
  } catch (error) {
    console.error("[DashboardService] Failed to load dashboard metrics:", error);
    return {
      totalProjectsCount: 0,
      publishedProjectsCount: 0,
      totalProductsCount: 0,
      publishedProductsCount: 0,
      totalLeadsCount: 0,
      newLeadsCount: 0,
      recentProjects: [],
      recentProducts: [],
      recentLeads: [],
    };
  }
}

