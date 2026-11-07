import crypto from "node:crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "../db";
import { adminSessions, adminUsers, type AdminUser } from "../db/schema";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createAdminSession(
  adminUserId: string,
  expiresInDays = 7
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await db.insert(adminSessions).values({
    adminUserId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function validateAdminSession(token: string): Promise<{
  session: typeof adminSessions.$inferSelect;
  user: Pick<AdminUser, "id" | "name" | "email" | "role">;
} | null> {
  if (!token) return null;

  const tokenHash = hashToken(token);
  const now = new Date();

  const [record] = await db
    .select({
      session: adminSessions,
      user: {
        id: adminUsers.id,
        name: adminUsers.name,
        email: adminUsers.email,
        role: adminUsers.role,
        isActive: adminUsers.isActive,
      },
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminUserId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, now)))
    .limit(1);

  if (!record || !record.user.isActive) {
    return null;
  }

  // Update lastSeenAt if it's been more than 5 minutes since last update
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  if (record.session.lastSeenAt < fiveMinutesAgo) {
    await db
      .update(adminSessions)
      .set({ lastSeenAt: now })
      .where(eq(adminSessions.id, record.session.id));
  }

  return {
    session: record.session,
    user: {
      id: record.user.id,
      name: record.user.name,
      email: record.user.email,
      role: record.user.role,
    },
  };
}

export async function revokeAdminSession(token: string): Promise<void> {
  if (!token) return;
  const tokenHash = hashToken(token);
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
}

export async function revokeAllAdminSessions(adminUserId: string): Promise<void> {
  await db.delete(adminSessions).where(eq(adminSessions.adminUserId, adminUserId));
}

