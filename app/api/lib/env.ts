import dotenv from "dotenv";
import path from "path";

// Vite SSR does not always load .env via import "dotenv/config".
const appRoot = path.resolve(import.meta.dirname, "../..");
dotenv.config({ path: path.join(appRoot, ".env") });

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  kimiAuthUrl: required("KIMI_AUTH_URL"),
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  devLocalAuthEnabled:
    !process.env.NODE_ENV || process.env.NODE_ENV !== "production"
      ? process.env.DEV_LOCAL_AUTH === "true"
      : false,
  devLoginUser: process.env.DEV_LOGIN_USER ?? "admin",
  devLoginPassword: process.env.DEV_LOGIN_PASSWORD ?? "admin123",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
};
