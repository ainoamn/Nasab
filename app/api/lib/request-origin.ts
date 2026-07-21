import { env } from "./env";

/** أصل الطلب الموثوق — لا نستخدم origin من العميل */
export function getRequestOrigin(headers: Headers, requestUrl?: string): string {
  const fromEnv = env.appPublicUrl?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (env.trustProxy) {
    const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const host = headers.get("x-forwarded-host")?.split(",")[0]?.trim()
      ?? headers.get("host")?.trim();
    if (host) return `${proto ?? "https"}://${host}`;
  }

  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  const host = headers.get("host");
  if (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")) {
    return `http://${host}`;
  }

  return env.isProduction ? "https://localhost" : "http://localhost:5173";
}

export function isAllowedRedirectUri(uri: string, origin: string): boolean {
  try {
    const u = new URL(uri);
    const allowed = env.allowedOrigins.length > 0 ? env.allowedOrigins : [origin];
    const target = `${u.protocol}//${u.host}`;
    return allowed.some((a) => a.replace(/\/$/, "") === target);
  } catch {
    return false;
  }
}
