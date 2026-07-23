#!/usr/bin/env node
/**
 * ضبط إعدادات الإطلاق في .env.production (لا يُرفع إلى Git).
 *
 * أمثلة:
 *   node scripts/configure-launch.mjs --domain=https://nasab.example.com --union-id=YOUR_ID
 *   node scripts/configure-launch.mjs --bank-name="بنك مسقط" --account-name="..." --account-number="..." --iban="OM..."
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.production");

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    const i = a.indexOf("=");
    if (i === -1) out[a.slice(2)] = true;
    else out[a.slice(2, i)] = a.slice(i + 1);
  }
  return out;
}

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(content)) return content.replace(re, line);
  return `${content.trimEnd()}\n${line}\n`;
}

const args = parseArgs(process.argv.slice(2));
if (!fs.existsSync(envPath)) {
  const example = path.join(root, ".env.production.example");
  fs.copyFileSync(example, envPath);
  console.log("created .env.production from example");
}

let content = fs.readFileSync(envPath, "utf8");

if (args.domain) {
  const domain = String(args.domain).replace(/\/$/, "");
  content = upsertEnv(content, "APP_PUBLIC_URL", domain);
  content = upsertEnv(content, "ALLOWED_ORIGINS", domain);
  content = upsertEnv(content, "TRUST_PROXY", "true");
  content = upsertEnv(content, "NODE_ENV", "production");
  content = upsertEnv(content, "DEV_LOCAL_AUTH", "false");
}

if (args["union-id"]) {
  content = upsertEnv(content, "OWNER_UNION_ID", String(args["union-id"]));
}

content = upsertEnv(content, "BOOTSTRAP_FIRST_ADMIN", "true");

// مزامنة VITE_* من قيم الـ backend إن وُجدت
const appIdMatch = content.match(/^APP_ID=(.+)$/m);
const kimiMatch = content.match(/^KIMI_AUTH_URL=(.+)$/m);
if (appIdMatch?.[1]?.trim()) {
  content = upsertEnv(content, "VITE_APP_ID", appIdMatch[1].trim());
}
if (kimiMatch?.[1]?.trim()) {
  content = upsertEnv(content, "VITE_KIMI_AUTH_URL", kimiMatch[1].trim());
}

if (args["bank-name"]) content = upsertEnv(content, "BANK_NAME", String(args["bank-name"]));
if (args["account-name"])
  content = upsertEnv(content, "BANK_ACCOUNT_NAME", String(args["account-name"]));
if (args["account-number"])
  content = upsertEnv(content, "BANK_ACCOUNT_NUMBER", String(args["account-number"]));
if (args.iban) content = upsertEnv(content, "BANK_IBAN", String(args.iban));
if (args.instructions)
  content = upsertEnv(content, "BANK_INSTRUCTIONS", String(args.instructions));

fs.writeFileSync(envPath, content, "utf8");
console.log("updated", envPath);
console.log("keys touched:", Object.keys(args).join(", ") || "(bootstrap flag only)");
