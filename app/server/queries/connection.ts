import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { env } from "../lib/env";
import {
  getDatabaseDialect,
  isSqliteDatabase,
  sanitizeDatabaseUrl,
} from "@db/dialect";
import * as mysqlSchema from "@db/schema";
import * as sqliteSchema from "@db/schema.sqlite";
import * as pgSchema from "@db/schema.pg";
import * as relations from "@db/relations";

/**
 * Multi-dialect runtime (SQLite dev / MySQL or Postgres prod).
 * Drivers are required lazily so Vite SSR does not resolve `postgres`
 * during local SQLite development.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppDb = any;

let instance: AppDb;

function nodeRequire(): NodeRequire {
  try {
    const metaUrl = import.meta.url;
    if (typeof metaUrl === "string" && metaUrl.length > 0) {
      return createRequire(metaUrl);
    }
  } catch {
    /* CJS bundle: import.meta may be empty */
  }
  return createRequire(path.join(process.cwd(), "package.json"));
}

export function isSqliteDb(): boolean {
  return isSqliteDatabase(env.databaseUrl);
}

export function getDb(): AppDb {
  if (!instance) {
    const dialect = getDatabaseDialect(env.databaseUrl);
    const require = nodeRequire();
    if (dialect === "sqlite") {
      const Database = require("better-sqlite3") as typeof import("better-sqlite3");
      const { drizzle } =
        require("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");
      const dbPath = env.databaseUrl.replace(/^file:/, "");
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const sqlite = new Database(dbPath);
      sqlite.pragma("journal_mode = WAL");
      const fullSchema = { ...sqliteSchema, ...relations };
      instance = drizzle(sqlite, { schema: fullSchema });
    } else if (dialect === "postgres") {
      const postgres = require("postgres") as typeof import("postgres");
      const { drizzle } =
        require("drizzle-orm/postgres-js") as typeof import("drizzle-orm/postgres-js");
      const url = sanitizeDatabaseUrl(env.databaseUrl);
      const max = process.env.VERCEL ? 1 : 10;
      const client = postgres(url, { prepare: false, max });
      const fullSchema = { ...pgSchema, ...relations };
      instance = drizzle(client, { schema: fullSchema });
    } else {
      const { drizzle } =
        require("drizzle-orm/mysql2") as typeof import("drizzle-orm/mysql2");
      const fullSchema = { ...mysqlSchema, ...relations };
      instance = drizzle(env.databaseUrl, {
        mode: "default",
        schema: fullSchema,
      });
    }
  }
  return instance;
}
