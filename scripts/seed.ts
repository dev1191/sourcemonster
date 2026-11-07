import "dotenv/config";
import { client } from "../src/lib/db/client";
import { seedAdminUser } from "./seeders/admin-user";
import { seedStaticContent } from "./seeders/static-content";

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((arg) => arg.startsWith("--only="))?.split("=")[1];
  const resetPassword = args.includes("--reset-password");
  const force = args.includes("--force");

  console.log("🚀 Starting database seeding...");

  try {
    if (!onlyArg || onlyArg === "admin") {
      await seedAdminUser({ resetPassword });
    }

    if (!onlyArg || onlyArg === "content") {
      await seedStaticContent({ force });
    }

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await client.end({ timeout: 5 });
  }
}

main();

