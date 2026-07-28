import type { Context, Next } from "hono";
import { env } from "./env";

export async function securityHeadersMiddleware(c: Context, next: Next) {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (env.isProduction) {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  c.header(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  );
}
