#!/usr/bin/env node
/**
 * Push critical production env vars to Vercel from local .env.production / .env.
 *
 * Usage:
 *   set VERCEL_TOKEN=...   (or vercel login)
 *   node scripts/push-vercel-env.mjs
 *
 * Requires: vercel CLI linked to the project (Root Directory = app).
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const out = {};
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = {
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.production")),
};

const required = [
  "DATABASE_URL",
  "APP_SECRET",
  "PASSWORD_LOGIN_EMAIL",
  "PASSWORD_LOGIN_PASSWORD",
  "OWNER_UNION_ID",
  "APP_PUBLIC_URL",
  "ALLOWED_ORIGINS",
];

const defaults = {
  OWNER_UNION_ID: "password:admin@bhd.om",
  PASSWORD_LOGIN_EMAIL: "admin@bhd.om",
  PASSWORD_LOGIN_PASSWORD: "Admin@1234",
  APP_PUBLIC_URL: "https://nasab-mu.vercel.app",
  ALLOWED_ORIGINS: "https://nasab-mu.vercel.app",
  TRUST_PROXY: "true",
  APP_ID: env.APP_ID || env.VITE_APP_ID || "nasab-app",
  KIMI_AUTH_URL: env.KIMI_AUTH_URL || "https://auth.kimi.com",
  KIMI_OPEN_URL: env.KIMI_OPEN_URL || "https://open.kimi.com",
};

const toPush = { ...defaults };
for (const key of [
  ...required,
  "TRUST_PROXY",
  "APP_ID",
  "KIMI_AUTH_URL",
  "KIMI_OPEN_URL",
  "VITE_APP_ID",
  "VITE_KIMI_AUTH_URL",
]) {
  if (env[key]) toPush[key] = env[key];
}

if (!toPush.DATABASE_URL?.startsWith("postgres")) {
  console.error("DATABASE_URL missing or not postgres in .env.production");
  process.exit(1);
}
if (!toPush.APP_SECRET || toPush.APP_SECRET.length < 32) {
  console.error("APP_SECRET missing or shorter than 32 chars");
  process.exit(1);
}

function vercel(args, input) {
  const r = spawnSync("vercel", args, {
    cwd: root,
    input,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout || `vercel ${args.join(" ")} failed`);
    return false;
  }
  return true;
}

console.log("Pushing env to Vercel (production)…");
for (const [key, value] of Object.entries(toPush)) {
  if (!value) continue;
  process.stdout.write(`  ${key}… `);
  // Remove then add to force update (vercel env add is interactive without --force on older CLIs)
  spawnSync("vercel", ["env", "rm", key, "production", "-y"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
  });
  const ok = vercel(
    ["env", "add", key, "production"],
    `${value}\n`,
  );
  console.log(ok ? "ok" : "FAIL");
}

console.log("\nDone. Trigger a Redeploy from the Vercel dashboard (or: vercel --prod).");
