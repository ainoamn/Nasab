import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { sql } from "drizzle-orm";
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

/**
 * Multi-dialect runtime (SQLite dev / MySQL or Postgres prod).
 * Drivers are required lazily so Vite SSR does not resolve `postgres`
 * during local SQLite development.
 *
 * On Vercel, Postgres uses `@neondatabase/serverless` (HTTP) so cold
 * starts do not hang on TCP sockets the way `postgres` (postgres.js) can.
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
      if (isServerlessRuntime()) {
        const { neon } =
          require("@neondatabase/serverless") as typeof import("@neondatabase/serverless");
        const { drizzle } =
          require("drizzle-orm/neon-http") as typeof import("drizzle-orm/neon-http");
        instance = drizzle(neon(url), { schema: fullSchema });
      } else {
        const postgres = require("postgres") as typeof import("postgres");
        const { drizzle } =
          require("drizzle-orm/postgres-js") as typeof import("drizzle-orm/postgres-js");
        const client = postgres(url, {
          prepare: false,
          max: 10,
          connect_timeout: 10,
          idle_timeout: 20,
          max_lifetime: 60 * 5,
        });
        instance = drizzle(client, { schema: fullSchema });
      }
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

/** Lightweight connectivity probe (never hangs forever). */
export async function pingDatabase(timeoutMs = 4000): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!env.databaseUrl?.trim()) {
    return { ok: false, error: "DATABASE_URL missing" };
  }
  try {
    const db = getDb();
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`db ping timeout ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
