import {
  applyAccountIsolation,
  clearAccountRebindLock,
  isAccountRebindPending,
  isIdentityOrigin,
  productStartPath,
  scrubCacheBustFromUrl,
} from "@/lib/identity/client";
import { loadBhdIdentity } from "@/lib/identity/bhd-browser";
import { boundWindowToken, readActiveAu, setActiveAu } from "@/lib/identity/window-session";
import { useEffect } from "react";

type LocalMe = {
  user?: {
    id?: string;
  } | null;
};

/**
 * Keep THIS tab on its ?au= account. Drift from another tab's shared cookie is
 * repaired silently (JSON rebind) — never a full-screen notice.
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
    let timer = 0;

    async function reconcile() {
      if (cancelled || isAccountRebindPending() || document.hidden) return;
      try {
        const au = readActiveAu();
        if (au) setActiveAu(au);

        const localResponse = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        const local = (await localResponse.json().catch(() => ({}))) as LocalMe;
        if (cancelled) return;

        if (local.user?.id && au && local.user.id === au) {
          clearAccountRebindLock();
          scrubCacheBustFromUrl();
          return;
        }

        const identity = await loadBhdIdentity();
        if (cancelled || !identity) return;
        const { ok, body } = await identity.me();
        if (cancelled || !ok || !body.user?.id) {
          clearAccountRebindLock();
          return;
        }

        const identityId = body.user.id;
        const targetAu = au || identityId;

        if (local.user?.id && local.user.id === identityId && local.user.id === targetAu) {
          clearAccountRebindLock();
          scrubCacheBustFromUrl();
          return;
        }

        const guardKey = `bhd-sso:${targetAu || identityId}`;
        const last = Number(sessionStorage.getItem(guardKey) || "0");
        if (last && Date.now() - last < 12_000) return;
        sessionStorage.setItem(guardKey, String(Date.now()));

        if (!local.user?.id) {
          const here = `${window.location.pathname}${window.location.search || ""}` || "/";
          window.location.replace(identity.productStart(here) || productStartPath(here));
          return;
        }

        const token =
          (au && identityId !== au ? boundWindowToken() : "") || boundWindowToken() || body.token;
        await applyAccountIsolation(token, {
          force: true,
          sub: targetAu || identityId,
          silent: true,
        });
      } catch {
        clearAccountRebindLock();
      }
    }

    void reconcile();
    const onVis = () => {
      if (!document.hidden) void reconcile();
    };
    document.addEventListener("visibilitychange", onVis);
    timer = window.setInterval(() => {
      if (!document.hidden) void reconcile();
    }, 20_000);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(timer);
    };
  }, []);

  return null;
}
