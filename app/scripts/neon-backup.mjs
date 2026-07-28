#!/usr/bin/env node
/**
 * Lightweight Neon backup → app/.data/backups/neon-YYYYMMDD-HHMMSS.json
 * Usage: node scripts/neon-backup.mjs
 */
import dotenv from "dotenv";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { sanitizeDatabaseUrl } from "../db/dialect.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.production"), override: true });

const url = process.env.DATABASE_URL || "";
if (!/^postgres/i.test(url)) {
  console.error("DATABASE_URL must be postgres");
  process.exit(1);
}

const sql = neon(sanitizeDatabaseUrl(url));
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const outDir = path.join(root, ".data", "backups");
mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `neon-${stamp}.json`);

async function dump(label, query) {
  const rows = await query;
  return { count: rows.length, rows };
}

const payload = {
  createdAt: new Date().toISOString(),
  host: (() => {
    try {
      return new URL(url).host;
    } catch {
      return null;
    }
  })(),
  tables: {},
};

const jobs = [
  ["users", () => sql`select * from users`],
  ["subscription_plans", () => sql`select * from subscription_plans`],
  ["payment_gateways", () => sql`select * from payment_gateways`],
  ["platform_settings", () => sql`select * from platform_settings`],
  ["trees", () => sql`select * from trees`],
  ["persons", () => sql`select * from persons`],
  ["relationships", () => sql`select * from relationships`],
  ["tree_members", () => sql`select * from tree_members`],
  ["invites", () => sql`select * from invites`],
  ["invoices", () => sql`select * from invoices`],
];

for (const [table, fn] of jobs) {
  try {
    payload.tables[table] = await dump(table, fn());
    console.log("OK", table, payload.tables[table].count);
  } catch (e) {
    payload.tables[table] = { error: e?.message || String(e) };
    console.warn("SKIP", table, e?.message || e);
  }
}

writeFileSync(outFile, JSON.stringify(payload, null, 2));
console.log("WROTE", outFile);
