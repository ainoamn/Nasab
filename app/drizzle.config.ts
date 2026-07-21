import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { isSqliteDatabase } from "./db/dialect";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const sqlite = isSqliteDatabase(connectionString);

export default defineConfig({
  schema: sqlite ? "./db/schema.sqlite.ts" : "./db/schema.ts",
  out: "./db/migrations",
  dialect: sqlite ? "sqlite" : "mysql",
  dbCredentials: sqlite
    ? { url: connectionString.replace(/^file:/, "") }
    : { url: connectionString },
});
