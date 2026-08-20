export const LOGIN_PATH = "/login";
export const BHD_START_PATH = "/api/auth/bhd/start";
export const BHD_ADMIN_ENTRY_PATH = "/api/auth/admin-entry";

export function bhdStartHref(returnTo?: string | null): string {
  if (
    returnTo &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.startsWith("/\\") &&
    !returnTo.includes("://")
  ) {
    return `${BHD_START_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return BHD_START_PATH;
}

/** دخول لوحة الإدارة عبر SSO — القسم 4.9 */
export function bhdAdminEntryHref(next?: string | null): string {
  if (
    next &&
    next.startsWith("/admin") &&
    !next.startsWith("//") &&
    !next.includes("://")
  ) {
    return `${BHD_ADMIN_ENTRY_PATH}?next=${encodeURIComponent(next)}`;
  }
  return BHD_ADMIN_ENTRY_PATH;
}
