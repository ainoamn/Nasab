import { identityFetch, isIdentityOrigin, productStartPath } from "@/lib/identity/client";
import { useEffect } from "react";

type LocalMe = {
  user?: {
    id?: string;
    bhdSub?: string | null;
  } | null;
};

/**
 * إن وُجد حساب نشط على الهوية ولم تطابق جلسة نَسَب → start صامت.
 * لا /login?add=1 ولا طلب خروج.
 */
export function BhdSilentSso() {
  useEffect(() => {
    const path = window.location.pathname;
    if (
      isIdentityOrigin() ||
      path.startsWith("/login") ||
      path.startsWith("/setup") ||
      path.startsWith("/share/") ||
      path.startsWith("/invite/") ||
      path.startsWith("/api/") ||
      path.startsWith("/docs/")
    ) {
      return;
    }

    let cancelled = false;
    const here = `${window.location.pathname}${window.location.search || ""}` || "/";
    const guardKey = `bhd-sso:${here}`;
    if (sessionStorage.getItem(guardKey) === "1") return;

    identityFetch("/api/auth/me")
      .then((response) => response.json())
      .then(async (identity: { user?: { id?: string } | null }) => {
        if (cancelled || !identity.user?.id) return;
        const localResponse = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        const local = (await localResponse.json().catch(() => ({}))) as LocalMe;
        if (cancelled) return;
        const productSub = local.user?.bhdSub || local.user?.id || null;
        if (productSub && productSub === identity.user.id) return;
        sessionStorage.setItem(guardKey, "1");
        window.location.replace(productStartPath(here));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
