import dotenv from "dotenv";
import path from "path";
import { normalizeDatabaseUrl } from "@db/dialect";
import {
  BOOTSTRAP_ADMIN_EMAIL,
  BOOTSTRAP_ADMIN_PASSWORD,
  passwordLoginUnionId,
} from "./password-login";

// Vite SSR / Docker / Vercel: load from project cwd (stable after bundling).
const appRoot = process.cwd();
dotenv.config({ path: path.join(appRoot, ".env") });
if (process.env.NODE_ENV === "production") {
  dotenv.config({
    path: path.join(appRoot, ".env.production"),
    override: true,
  });
} else {
  dotenv.config({
    path: path.join(appRoot, ".env.production"),
    override: false,
  });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    // Do not throw at import time — Vercel health/config must still load.
    console.error(`[nasab] missing env: ${name}`);
  }
  return value ?? "";
}

const passwordLoginEmail = (
  process.env.PASSWORD_LOGIN_EMAIL?.trim() || BOOTSTRAP_ADMIN_EMAIL
).toLowerCase();

const envBase = {
  appId: required("APP_ID") || process.env.VITE_APP_ID || "nasab-app",
  /** JWT/session secret — set APP_SECRET on Vercel (≥ 32 chars). */
  appSecret:
    required("APP_SECRET") ||
    "nasab-bootstrap-app-secret-change-on-vercel-now",
  isProduction: process.env.NODE_ENV === "production",
  kimiAuthUrl: required("KIMI_AUTH_URL") || process.env.VITE_KIMI_AUTH_URL || "",
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  /** Default owner = password-login admin so that account stays platform admin. */
  ownerUnionId:
    process.env.OWNER_UNION_ID?.trim() ||
    passwordLoginUnionId(passwordLoginEmail),
  bootstrapFirstAdmin: process.env.BOOTSTRAP_FIRST_ADMIN !== "false",
  devLocalAuthEnabled:
    !process.env.NODE_ENV || process.env.NODE_ENV !== "production"
      ? process.env.DEV_LOCAL_AUTH === "true"
      : false,
  devLoginUser: process.env.DEV_LOGIN_USER ?? "admin",
  devLoginPassword: process.env.DEV_LOGIN_PASSWORD ?? "admin123",
  passwordLoginEnabled: true,
  passwordLoginEmail,
  passwordLoginPassword: (
    process.env.PASSWORD_LOGIN_PASSWORD || BOOTSTRAP_ADMIN_PASSWORD
  ).replace(/\r?\n$/g, ""),
  googleClientId: (process.env.GOOGLE_CLIENT_ID ?? "")
    .replace(/^\uFEFF/, "")
    .trim(),
  googleClientSecret: (process.env.GOOGLE_CLIENT_SECRET ?? "")
    .replace(/^\uFEFF/, "")
    .trim(),
  appPublicUrl:
    process.env.APP_PUBLIC_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""),
  trustProxy: process.env.TRUST_PROXY === "true" || Boolean(process.env.VERCEL),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  bankName: process.env.BANK_NAME ?? "",
  bankAccountName: process.env.BANK_ACCOUNT_NAME ?? "",
  bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "",
  bankIban: process.env.BANK_IBAN ?? "",
  bankInstructions: process.env.BANK_INSTRUCTIONS ?? "",
};

/** Live DATABASE_URL — always read process.env (Vercel injects at runtime). */
export const env = {
  ...envBase,
  get databaseUrl() {
    return normalizeDatabaseUrl(process.env.DATABASE_URL ?? "");
  },
};
