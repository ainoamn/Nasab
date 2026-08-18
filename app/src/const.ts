export const LOGIN_PATH = "/login";
export const BHD_START_PATH = "/api/auth/bhd/start";

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
