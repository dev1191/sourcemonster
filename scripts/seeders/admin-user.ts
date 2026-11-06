import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { adminUsers } from "../../src/lib/db/schema";
import { hashPassword } from "../../src/lib/auth/password";

const adminEnvSchema = z.object({
  name: z.string().min(1, "SEED_ADMIN_NAME is required"),
  email: z.string().email("Invalid SEED_ADMIN_EMAIL").toLowerCase().trim(),
  password: z.string().min(12, "SEED_ADMIN_PASSWORD must be at least 12 characters long"),
});

const FORBIDDEN_PASSWORDS = [
  "change-me",
  "changeme",
  "password",
  "admin123456",
  "123456789012",
  "placeholder",
];

export async function seedAdminUser(options: { resetPassword?: boolean } = {}) {
  const name = process.env.SEED_ADMIN_NAME;
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  const isProduction = process.env.NODE_ENV === "production";

  if (!password && !isProduction) {
    console.warn("⚠️  SEED_ADMIN_PASSWORD not set in environment. Skipping admin seeder.");
    return;
  }

  const parseResult = adminEnvSchema.safeParse({ name, email, password });
  if (!parseResult.parseResult && !parseResult.success) {
    console.error("❌ Admin seeder validation failed:", parseResult.error.flatten().fieldErrors);
    throw new Error("Invalid admin seed credentials");
  }

  const { name: validName, email: validEmail, password: validPassword } = parseResult.data;

  if (isProduction && FORBIDDEN_PASSWORDS.includes(validPassword.toLowerCase())) {
    throw new Error("❌ Refusing to run admin seeder in production with a known placeholder password!");
  }

  const [existingUser] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, validEmail))
    .limit(1);

  if (existingUser) {
    if (!options.resetPassword) {
      console.log(`ℹ️  Admin user [${validEmail}] already exists. Skipping.`);
      return;
    }
    console.log(`🔄 Resetting password for existing admin [${validEmail}]...`);
    const newHash = await hashPassword(validPassword);
    await db
      .update(adminUsers)
      .set({
        passwordHash: newHash,
        name: validName,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existingUser.id));
    console.log(`✅ Admin password reset successfully for: ${validEmail}`);
    return;
  }

  console.log(`🌱 Creating initial admin user: ${validEmail}...`);
  const passwordHash = await hashPassword(validPassword);

  await db.insert(adminUsers).values({
    name: validName,
    email: validEmail,
    passwordHash,
    role: "admin",
    isActive: true,
  });

  console.log(`✅ Admin user created successfully: ${validEmail}`);
}

