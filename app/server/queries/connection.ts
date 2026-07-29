import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { drizzle as drizzleNeonHttp } from "drizzle-orm/neon-http";
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let neonSql: any;

function liveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    env.databaseUrl?.trim() ||
    ""
  );
}

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
  return isSqliteDatabase(liveDatabaseUrl());
}

/** Neon HTTP SQL tagged template (Vercel sidecar). Null off serverless / SQLite. */
export function getNeonSql() {
  getDb();
  return neonSql ?? null;
}

export function getDb(): AppDb {
  if (!instance) {
    const databaseUrl = liveDatabaseUrl();
    const dialect = getDatabaseDialect(databaseUrl);
    const require = nodeRequire();
    if (dialect === "sqlite") {
      const Database = require("better-sqlite3") as typeof import("better-sqlite3");
      const { drizzle } =
        require("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");
      const dbPath = databaseUrl.replace(/^file:/, "");
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const sqlite = new Database(dbPath);
      sqlite.pragma("journal_mode = WAL");
      const fullSchema = { ...sqliteSchema, ...relations };
      instance = drizzle(sqlite, { schema: fullSchema });
    } else if (dialect === "postgres") {
      const url = sanitizeDatabaseUrl(databaseUrl);
      const fullSchema = { ...pgSchema, ...relations };
      const max = process.env.VERCEL ? 1 : 10;
      // On Vercel, `db-pg.cjs` is built beside the handler (see vercel-build.mjs).
      // Keep this require dynamic so cold start never evaluates postgres.js / neon.
      try {
        if (process.env.VERCEL || process.env.NASAB_SERVERLESS === "1") {
          const sidecar = path.join(process.cwd(), "db-pg.cjs");
          if (!fs.existsSync(sidecar)) {
            throw new Error(`db-pg sidecar missing at ${sidecar}`);
          }
          const mod = require(sidecar) as {
            createNeonSql?: (u: string) => unknown;
            createPg?: (
              u: string,
              s: Record<string, unknown>,
              o?: { max?: number },
            ) => AppDb;
          };
          if (typeof mod.createNeonSql === "function") {
            neonSql = mod.createNeonSql(url);
            instance = drizzleNeonHttp(neonSql, { schema: fullSchema });
          } else if (typeof mod.createPg === "function") {
            instance = mod.createPg(url, fullSchema, { max });
          } else {
            throw new Error("db-pg sidecar missing createNeonSql/createPg");
          }
        } else {
          throw new Error("use-local-postgres");
        }
      } catch (err) {
        if (process.env.VERCEL || process.env.NASAB_SERVERLESS === "1") {
          console.error(
            "[nasab] db-pg sidecar failed:",
            err instanceof Error ? err.message : err,
          );
          throw err;
        }
        const postgres = require("postgres") as typeof import("postgres");
        const { drizzle } =
          require("drizzle-orm/postgres-js") as typeof import("drizzle-orm/postgres-js");
        const client = postgres(url, {
          prepare: false,
          max,
          connect_timeout: 10,
          idle_timeout: 20,
          max_lifetime: 60 * 5,
        });
        instance = drizzle(client, { schema: fullSchema });
      }
    } else {
      if (!databaseUrl) {
        throw new Error("DATABASE_URL is empty — cannot open database");
      }
      const { drizzle } =
        require("drizzle-orm/mysql2") as typeof import("drizzle-orm/mysql2");
      const fullSchema = { ...mysqlSchema, ...relations };
      instance = drizzle(databaseUrl, {
        mode: "default",
        schema: fullSchema,
      });
    }
  }
  return instance;
}

/** Drop cached connection (tests / after config change). */
export function resetDbForTests() {
  instance = undefined;
  neonSql = undefined;
}
