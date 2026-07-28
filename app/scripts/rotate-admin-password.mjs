#!/usr/bin/env node
/**
 * Rotate PASSWORD_LOGIN_PASSWORD (env-based admin login).
 * Does not store the password in the DB — only prints / optionally writes .env.production.
 *
 * Usage:
 *   node scripts/rotate-admin-password.mjs
 *   node scripts/rotate-admin-password.mjs --write-env
 *   node scripts/rotate-admin-password.mjs --password='YourStrongPass!'
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env.production");

const args = process.argv.slice(2);
const writeEnv = args.includes("--write-env");
const passwordArg = args.find((a) => a.startsWith("--password="));
const nextPassword =
  passwordArg?.slice("--password=".length) ||
  `Nasab-${randomBytes(9).toString("base64url")}`;

if (nextPassword.length < 10) {
  console.error("Password must be at least 10 characters");
  process.exit(1);
}

console.log("New PASSWORD_LOGIN_PASSWORD (copy to Vercel Production env):");
console.log(nextPassword);
console.log("");
console.log("Then Redeploy. Local Neon admin row is unchanged (password is env-only).");
console.log("Also update GitHub secret if you use ops backup with login checks.");

if (writeEnv) {
  if (!existsSync(envPath)) {
    console.error(`Missing ${envPath}`);
    process.exit(1);
  }
  let text = readFileSync(envPath, "utf8");
  if (/^PASSWORD_LOGIN_PASSWORD=/m.test(text)) {
    text = text.replace(
      /^PASSWORD_LOGIN_PASSWORD=.*$/m,
      `PASSWORD_LOGIN_PASSWORD=${nextPassword}`,
    );
  } else {
    text += `\nPASSWORD_LOGIN_PASSWORD=${nextPassword}\n`;
  }
  writeFileSync(envPath, text);
  console.log(`Wrote ${envPath}`);
} else {
  console.log("Tip: re-run with --write-env to update app/.env.production locally.");
}
