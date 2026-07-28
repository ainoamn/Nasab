#!/usr/bin/env node
/**
 * Print Production env values ready to paste into Vercel dashboard.
 * Secrets are shown in full from local .env.production (do not commit output).
 *
 * Usage:
 *   node scripts/print-vercel-env.mjs
 *   node scripts/print-vercel-env.mjs --checklist   # soft checklist without abort
 */
import { existsSync, readFileSync, appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checklistOnly = process.argv.includes("--checklist");

function load(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = {
  ...load(path.join(root, ".env")),
  ...load(path.join(root, ".env.production")),
};

if (!env.APP_SECRET || env.APP_SECRET.length < 32) {
  env.APP_SECRET = randomBytes(48).toString("hex");
  appendFileSync(path.join(root, ".env.production"), `\nAPP_SECRET=${env.APP_SECRET}\n`);
  console.error("(generated APP_SECRET → .env.production)\n");
}

const rows = {
  DATABASE_URL: env.DATABASE_URL || "",
  APP_SECRET: env.APP_SECRET,
  PASSWORD_LOGIN_EMAIL: env.PASSWORD_LOGIN_EMAIL || "admin@bhd.om",
  PASSWORD_LOGIN_PASSWORD: env.PASSWORD_LOGIN_PASSWORD || "Admin@1234",
  OWNER_UNION_ID: env.OWNER_UNION_ID || "password:admin@bhd.om",
  APP_PUBLIC_URL: env.APP_PUBLIC_URL || "https://nasab-mu.vercel.app",
  ALLOWED_ORIGINS: env.ALLOWED_ORIGINS || "https://nasab-mu.vercel.app",
  TRUST_PROXY: "true",
  APP_ID: env.APP_ID || env.VITE_APP_ID || "nasab-app",
};

const checks = [
  {
    ok: /^postgres/i.test(rows.DATABASE_URL),
    label: "DATABASE_URL (Neon pooled postgres)",
  },
  {
    ok: Boolean(rows.APP_SECRET && rows.APP_SECRET.length >= 32),
    label: "APP_SECRET (≥ 32 chars)",
  },
  {
    ok: Boolean(rows.PASSWORD_LOGIN_EMAIL && rows.PASSWORD_LOGIN_PASSWORD),
    label: "PASSWORD_LOGIN_EMAIL + PASSWORD_LOGIN_PASSWORD",
  },
  {
    ok: Boolean(rows.ALLOWED_ORIGINS),
    label: "ALLOWED_ORIGINS",
  },
  {
    ok: Boolean(rows.APP_PUBLIC_URL),
    label: "APP_PUBLIC_URL",
  },
];

console.log("Checklist (local .env.production):\n");
for (const c of checks) {
  console.log(`${c.ok ? "OK " : "MISS"}  ${c.label}`);
}
console.log("");

if (!/^postgres/i.test(rows.DATABASE_URL)) {
  console.error(
    "DATABASE_URL missing or not postgres in .env.production.\n" +
      "Add Neon pooled URL, then re-run. Use --checklist to print status only.\n",
  );
  if (!checklistOnly) process.exit(1);
}

if (checklistOnly) {
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
}

console.log("Paste these into Vercel → Settings → Environment Variables (Production):\n");
for (const [k, v] of Object.entries(rows)) {
  console.log(`${k}=${v}`);
}
console.log("\nThen: Deployments → … → Redeploy");
console.log("Check: https://nasab-mu.vercel.app/api/diag  (dbConfigured must be true)");
console.log("After first login: npm run admin:rotate -- --write-env");
