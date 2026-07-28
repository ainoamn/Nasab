import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import {
  getDatabaseDialect,
  sanitizeDatabaseUrl,
} from "./db/dialect";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const dialect = getDatabaseDialect(connectionString);

export default defineConfig({
  schema:
    dialect === "sqlite"
      ? "./db/schema.sqlite.ts"
      : dialect === "postgres"
        ? "./db/schema.pg.ts"
        : "./db/schema.ts",
  out: "./db/migrations",
  dialect:
    dialect === "sqlite"
      ? "sqlite"
      : dialect === "postgres"
        ? "postgresql"
        : "mysql",
  dbCredentials:
    dialect === "sqlite"
      ? { url: connectionString.replace(/^file:/, "") }
      : {
          url:
            dialect === "postgres"
              ? sanitizeDatabaseUrl(connectionString)
              : connectionString,
        },
});
