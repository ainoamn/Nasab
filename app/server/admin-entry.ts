import type { Context } from "hono";
import { isSafeReturnTo } from "./lib/bhd-identity";

/**
 * دخول الإدارة عبر هوية BHD — القسم 4.9 من الدليل المرجعي.
 * لا ترسل المشرف إلى `/login?admin=1` أو `?local=1`.
 */
function adminReturnTo(c: Context): string {
  const raw = c.req.query("next")?.trim() || "/admin";
  if (!isSafeReturnTo(raw) || !raw.startsWith("/admin")) {
    return "/admin";
  }
  return raw;
}

export function createAdminEntryHandler() {
  return (c: Context) => {
    const returnTo = adminReturnTo(c);
    return c.redirect(
      `/api/auth/bhd/start?returnTo=${encodeURIComponent(returnTo)}`,
      302,
    );
  };
}
