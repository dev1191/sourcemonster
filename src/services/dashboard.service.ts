import { db } from "../lib/db";
import { products, leads } from "../lib/db/schema";
import { desc, eq, count } from "drizzle-orm";

export interface DashboardMetrics {
  totalProductsCount: number;
  publishedProductsCount: number;
  totalLeadsCount: number;
  newLeadsCount: number;
  recentProducts: Array<typeof products.$inferSelect>;
  recentLeads: Array<typeof leads.$inferSelect>;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [productsCountRes] = await db.select({ value: count() }).from(products);
  const totalProductsCount = productsCountRes?.value ?? 0;

  const [publishedRes] = await db
    .select({ value: count() })
    .from(products)
    .where(eq(products.status, "published"));
  const publishedProductsCount = publishedRes?.value ?? 0;

  const [leadsCountRes] = await db.select({ value: count() }).from(leads);
  const totalLeadsCount = leadsCountRes?.value ?? 0;

  const [newLeadsRes] = await db
    .select({ value: count() })
    .from(leads)
    .where(eq(leads.status, "new"));
  const newLeadsCount = newLeadsRes?.value ?? 0;

  const recentProducts = await db
    .select()
    .from(products)
    .orderBy(desc(products.updatedAt))
    .limit(5);

  const recentLeads = await db
    .select()
    .from(leads)
    .orderBy(desc(leads.createdAt))
    .limit(5);

  return {
    totalProductsCount,
    publishedProductsCount,
    totalLeadsCount,
    newLeadsCount,
    recentProducts,
    recentLeads,
  };
}
