import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "../lib/env";
import { isSqliteDatabase } from "@db/dialect";
import * as mysqlSchema from "@db/schema";
import * as sqliteSchema from "@db/schema.sqlite";
import * as relations from "@db/relations";

/**
 * Dual-dialect runtime (SQLite dev / MySQL prod).
 * Typed as a permissive query API so tsc does not explode on mysql|sqlite unions.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppDb = any;

let instance: AppDb;

export function isSqliteDb(): boolean {
  return isSqliteDatabase(env.databaseUrl);
}

export function getDb(): AppDb {
  if (!instance) {
    if (isSqliteDb()) {
      const dbPath = env.databaseUrl.replace(/^file:/, "");
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      const sqlite = new Database(dbPath);
      sqlite.pragma("journal_mode = WAL");
      const fullSchema = { ...sqliteSchema, ...relations };
      instance = drizzleSqlite(sqlite, { schema: fullSchema });
    } else {
      const fullSchema = { ...mysqlSchema, ...relations };
      instance = drizzleMysql(env.databaseUrl, {
        mode: "default",
        schema: fullSchema,
      });
    }
  }
  return instance;
}
