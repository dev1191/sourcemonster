import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  (typeof import.meta !== "undefined" && import.meta.env?.DATABASE_URL) ||
  "postgresql://sourcemonster:change-me-locally@localhost:5432/sourcemonster";

// Maintain a single pool instance across hot reloads in development
declare global {
  // eslint-disable-next-line no-var
  var __sm_db_client__: postgres.Sql | undefined;
}

const client =
  globalThis.__sm_db_client__ ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__sm_db_client__ = client;
}

export const db = drizzle(client, { schema });
export { client };

