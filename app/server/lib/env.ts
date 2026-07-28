import dotenv from "dotenv";
import path from "path";

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

export const env = {
  appId: required("APP_ID") || process.env.VITE_APP_ID || "",
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  kimiAuthUrl: required("KIMI_AUTH_URL") || process.env.VITE_KIMI_AUTH_URL || "",
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  /** إذا لم يُضبط OWNER_UNION_ID: أول مستخدم يُنشأ يصبح مشرفاً */
  bootstrapFirstAdmin: process.env.BOOTSTRAP_FIRST_ADMIN !== "false",
  /** دخول تطوير محلي (معطّل تلقائياً في الإنتاج) */
  devLocalAuthEnabled:
    !process.env.NODE_ENV || process.env.NODE_ENV !== "production"
      ? process.env.DEV_LOCAL_AUTH === "true"
      : false,
  devLoginUser: process.env.DEV_LOGIN_USER ?? "admin",
  devLoginPassword: process.env.DEV_LOGIN_PASSWORD ?? "admin123",
  /**
   * دخول بالبريد/كلمة المرور.
   * يُفعَّل إذا ضُبطت المتغيرات، أو كقيم افتراضية للإطلاق عند غيابها
   * (يُفضَّل ضبط PASSWORD_LOGIN_* في Vercel).
   */
  passwordLoginEnabled: true,
  passwordLoginEmail: (
    process.env.PASSWORD_LOGIN_EMAIL?.trim() || "admin@bhd.om"
  ).toLowerCase(),
  passwordLoginPassword:
    process.env.PASSWORD_LOGIN_PASSWORD || "Admin@1234",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  appPublicUrl: process.env.APP_PUBLIC_URL ?? "",
  trustProxy: process.env.TRUST_PROXY === "true",
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
