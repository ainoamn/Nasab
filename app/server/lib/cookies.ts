import type { CookieOptions } from "hono/utils/cookie";

function isLocalhost(headers: Headers): boolean {
  const host = headers.get("host") || "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

/**
 * Production HTTPS: Secure + SameSite=None (needed for OAuth cross-site).
 * Localhost / non-prod: Lax without Secure so Vite/dev cookies work over HTTP.
 */
export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && !localhost) {
    return {
      httpOnly: true,
      path: "/",
      sameSite: "None",
      secure: true,
    };
  }

  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: false,
  };
}
