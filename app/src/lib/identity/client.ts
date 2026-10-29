import { getCachedCatalogApps } from "@/lib/bhd/catalog";
import { DEFAULT_IDENTITY_ISSUER } from "./issuer";
import { captureWindowToken, windowFetchHeaders } from "./window-session";

export function pageOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin.replace(/\/$/, "");
}

/** نَسَب منتج — ليس مضيف الهوية. */
export function isIdentityOrigin(origin = pageOrigin()) {
  return origin.replace(/\/$/, "") === DEFAULT_IDENTITY_ISSUER.replace(/\/$/, "");
}

export function identityApiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (isIdentityOrigin()) return normalized;
  return `${DEFAULT_IDENTITY_ISSUER}${normalized}`;
}

export async function identityFetch(path: string, init?: RequestInit) {
  const headers = windowFetchHeaders(init?.headers);
  const response = await fetch(identityApiUrl(path), {
    cache: "no-store",
    credentials: "include",
    ...init,
    headers,
  });
  const clone = response.clone();
  void clone
    .json()
    .then((data: { token?: unknown } | null) => {
      if (data && typeof data.token === "string") captureWindowToken(data.token);
    })
    .catch(() => undefined);
  return response;
}

export function currentReturnPath() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search || ""}` || "/";
}

export function cacheBustReturnPath(returnTo = "/") {
  const path = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  try {
    const url = new URL(path, "https://bhd.local");
    url.searchParams.delete("_bhd");
    url.searchParams.set("_bhd", String(Date.now()));
    return `${url.pathname}${url.search}`;
  } catch {
    return path.includes("?") ? `${path}&_bhd=${Date.now()}` : `${path}?_bhd=${Date.now()}`;
  }
}

export function productStartPath(returnTo = "/") {
  const path = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  return `/api/auth/bhd/start?returnTo=${encodeURIComponent(path)}`;
}

export function allowedBhdUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url.origin)) return "";
    if (url.origin === DEFAULT_IDENTITY_ISSUER.replace(/\/$/, "")) return url.toString();
    if (getCachedCatalogApps().some((app) => app.origin.replace(/\/$/, "") === url.origin)) return url.toString();
    if (url.hostname === "bhd-om.com" || url.hostname.endsWith(".bhd-om.com") || url.hostname.endsWith(".vercel.app")) return url.toString();
  } catch {
    /* ignore */
  }
  return "";
}

export function addAccountUrl() {
  const next = isIdentityOrigin()
    ? currentReturnPath()
    : `/auth/continue?to=${encodeURIComponent(typeof window === "undefined" ? "" : window.location.href)}`;
  return `${identityApiUrl("/login")}?add=1&next=${encodeURIComponent(next)}`;
}

const REBIND_LOCK = "bhd_rebind_lock";

export function isAccountRebindPending() {
  if (typeof sessionStorage === "undefined") return false;
  const raw = sessionStorage.getItem(REBIND_LOCK);
  if (!raw) return false;
  const at = Number(raw);
  return Number.isFinite(at) && Date.now() - at < 15_000;
}

function markIsolationPending() {
  sessionStorage.setItem(REBIND_LOCK, String(Date.now()));
  try {
    document.documentElement.dataset.bhdSwitching = "1";
  } catch {
    /* ignore */
  }
}

function rebindWithWindowToken(token: string, returnTo: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/auth/bhd/rebind";
  form.style.display = "none";
  const tokenInput = document.createElement("input");
  tokenInput.name = "token";
  tokenInput.value = token;
  const returnInput = document.createElement("input");
  returnInput.name = "returnTo";
  returnInput.value = cacheBustReturnPath(returnTo);
  form.append(tokenInput, returnInput);
  document.body.appendChild(form);
  form.submit();
}

export async function switchWindowAccount(sub: string): Promise<{ ok: boolean; token?: string; userId?: string }> {
  if (!sub) return { ok: false };
  const response = await identityFetch("/api/auth/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sub }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    token?: string;
    user?: { id?: string } | null;
  };
  if (typeof body.token === "string") captureWindowToken(body.token);
  return {
    ok: response.ok,
    token: typeof body.token === "string" ? body.token : undefined,
    userId: body.user?.id,
  };
}

export async function applyAccountIsolation(token?: string | null, options?: { force?: boolean }) {
  if (typeof window === "undefined") return;
  if (!options?.force && isAccountRebindPending()) return;
  const here = currentReturnPath();
  if (isIdentityOrigin()) {
    window.location.reload();
    return;
  }
  markIsolationPending();
  const windowToken = token || sessionStorage.getItem("bhd_window_token") || "";

  if (windowToken) {
    rebindWithWindowToken(windowToken, here);
    return;
  }

  try {
    const response = await identityFetch("/api/auth/window-handoff", { method: "POST" });
    const data = (await response.json().catch(() => ({}))) as { ticket?: string };
    const start = new URL(productStartPath(cacheBustReturnPath(here)), window.location.origin).toString();
    if (response.ok && data.ticket) {
      const handoff = new URL("/auth/handoff", DEFAULT_IDENTITY_ISSUER);
      handoff.searchParams.set("ticket", data.ticket);
      handoff.searchParams.set("next", start);
      window.location.assign(handoff.toString());
      return;
    }
  } catch {
    /* fall through */
  }

  window.location.assign(`/api/auth/bhd/logout?continue=${encodeURIComponent(productStartPath(cacheBustReturnPath(here)))}`);
}

export function clearAccountRebindLock() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(REBIND_LOCK);
  try {
    delete document.documentElement.dataset.bhdSwitching;
  } catch {
    /* ignore */
  }
}

export function identityRecoverUrl() {
  return `${DEFAULT_IDENTITY_ISSUER}/recover`;
}
