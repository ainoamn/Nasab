/**
 * Vercel Edge middleware — BHD-ACCOUNT-SWITCHER §5
 * بلا جلسة منتج → 307 إلى start (الهوية تُكمل صامتاً إن وُجدت bhd_id).
 * مع kimi_sid → مرّر الطلب للواجهة.
 */

const PROTECTED =
  /^\/(app|dashboard|account|checkout|admin|trees)(\/|$)/;

function hasProductSession(cookieHeader) {
  if (!cookieHeader) return false;
  return /(?:^|;\s*)kimi_sid=([^;]*)/.test(cookieHeader);
}

function safeReturnTo(pathname, search) {
  const full = `${pathname}${search || ""}`;
  if (!full.startsWith("/") || full.startsWith("//") || full.includes("://")) {
    return "/app";
  }
  return full.length <= 512 ? full : "/app";
}

export default function middleware(request) {
  const url = new URL(request.url);
  const { pathname, search } = url;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/docs/") ||
    pathname === "/login" ||
    pathname === "/setup" ||
    pathname.startsWith("/share/") ||
    pathname.startsWith("/invite/") ||
    !PROTECTED.test(pathname)
  ) {
    return new Response(null, {
      headers: { "x-middleware-next": "1" },
    });
  }

  if (hasProductSession(request.headers.get("cookie"))) {
    return new Response(null, {
      headers: { "x-middleware-next": "1" },
    });
  }

  const dest = new URL("/api/auth/bhd/start", url.origin);
  dest.searchParams.set("returnTo", safeReturnTo(pathname, search));
  return Response.redirect(dest, 307);
}
