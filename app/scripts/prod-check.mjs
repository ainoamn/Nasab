#!/usr/bin/env node
/**
 * فحص سريع لجاهزية بيئة الإنتاج قبل النشر.
 * الاستخدام: node scripts/prod-check.mjs
 * (يحمّل .env إن وُجد، ولا يطبع قيم الأسرار)
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.production") });

const isProd = process.env.NODE_ENV === "production";
const errors = [];
const warnings = [];

function present(name) {
  return Boolean(process.env[name]?.trim());
}

function requireVar(name) {
  if (!present(name)) errors.push(`مفقود: ${name}`);
}

if (isProd || process.argv.includes("--strict")) {
  requireVar("APP_ID");
  requireVar("APP_SECRET");
  requireVar("DATABASE_URL");
  requireVar("KIMI_AUTH_URL");
  requireVar("KIMI_OPEN_URL");
  requireVar("APP_PUBLIC_URL");
  requireVar("ALLOWED_ORIGINS");
  requireVar("VITE_APP_ID");
  requireVar("VITE_KIMI_AUTH_URL");

  const secret = process.env.APP_SECRET ?? "";
  if (secret && secret.length < 32) {
    errors.push("APP_SECRET أقصر من 32 حرفاً — أنشئ سراً عشوائياً قوياً");
  }

  const db = process.env.DATABASE_URL ?? "";
  if (db.startsWith("file:")) {
    errors.push("DATABASE_URL ما زال SQLite — استخدم MySQL في الإنتاج");
  }

  if (process.env.DEV_LOCAL_AUTH === "true") {
    errors.push("DEV_LOCAL_AUTH=true مرفوض في الإنتاج");
  }

  if (!present("OWNER_UNION_ID")) {
    warnings.push("OWNER_UNION_ID فارغ — لن يُرقّى أحد تلقائياً لمشرف عند أول دخول");
  }

  const pub = process.env.APP_PUBLIC_URL ?? "";
  if (pub && !pub.startsWith("https://") && !pub.includes("localhost")) {
    warnings.push("APP_PUBLIC_URL يفضّل أن يكون HTTPS في الإنتاج الحقيقي");
  }

  if (process.env.TRUST_PROXY !== "true") {
    warnings.push("TRUST_PROXY ليس true — فعّله إذا كنت خلف nginx/Caddy/Cloudflare");
  }
} else {
  warnings.push("شغّل بـ NODE_ENV=production أو --strict لفحص صارم");
  if (!present("APP_ID")) warnings.push("APP_ID غير مضبوط");
  if (!present("APP_SECRET")) warnings.push("APP_SECRET غير مضبوط");
}

const distBoot = path.join(root, "dist", "boot.js");
if (!fs.existsSync(distBoot)) {
  warnings.push("dist/boot.js غير موجود — نفّذ npm run build قبل النشر");
}

console.log("=== فحص جاهزية نَسَب ===");
if (errors.length === 0 && warnings.length === 0) {
  console.log("✓ جاهز");
  process.exit(0);
}
for (const e of errors) console.error("✗", e);
for (const w of warnings) console.warn("!", w);
process.exit(errors.length > 0 ? 1 : 0);
