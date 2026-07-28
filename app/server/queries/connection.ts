import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { env } from "../lib/env";
import {
  getDatabaseDialect,
  isServerlessRuntime,
  isSqliteDatabase,
  sanitizeDatabaseUrl,
} from "@db/dialect";
import * as mysqlSchema from "@db/schema";
import * as sqliteSchema from "@db/schema.sqlite";
import * as pgSchema from "@db/schema.pg";
import * as relations from "@db/relations";
import { createPostgresJsDb } from "./pg-node";

/**
 * Multi-dialect runtime (SQLite dev / MySQL or Postgres prod).
 * On Vercel, Postgres uses a statically imported postgres.js client so
 * esbuild inlines it into the Build Output function (no missing module).
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
    if (!env.databaseUrl?.trim()) {
      throw new Error("DATABASE_URL is not set");
    }
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
      const url = sanitizeDatabaseUrl(env.databaseUrl);
      const fullSchema = { ...pgSchema, ...relations };
      // Always use the statically imported client so the Vercel bundle
      // contains postgres.js (dynamic require() is left external by esbuild).
      instance = createPostgresJsDb(url, fullSchema, {
        max: isServerlessRuntime() ? 1 : 10,
      });
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
