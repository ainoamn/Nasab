import { DEFAULT_IDENTITY_ISSUER } from "./issuer";
import { bhdStartHref } from "@/const";
import type { AuthProviderMark, BhdSwitcherUser } from "@/components/bhd/BhdAppSwitcher";

export type IdentityAccount = BhdSwitcherUser & {
  id: string;
};

export type IdentityMeResponse = {
  user: IdentityAccount | null;
  accounts?: IdentityAccount[];
};

function identityUrl(path: string) {
  return `${DEFAULT_IDENTITY_ISSUER.replace(/\/$/, "")}${path}`;
}

async function identityFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(identityUrl(path), {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
}

function normalizeAccount(raw: Partial<IdentityAccount> & { id?: string }): IdentityAccount | null {
  if (!raw.id) return null;
  const providers = Array.isArray(raw.providers)
    ? (raw.providers.filter(Boolean) as AuthProviderMark[])
    : undefined;
  return {
    id: raw.id,
    name: raw.name || "",
    email: raw.email || "",
    username: raw.username ?? null,
    phone: raw.phone ?? null,
    picture: raw.picture ?? null,
    providers,
    googleLinked: raw.googleLinked,
    facebookLinked: raw.facebookLinked,
    hasPassword: raw.hasPassword,
  };
}

function normalizeMe(data: IdentityMeResponse): {
  user: IdentityAccount | null;
  accounts: IdentityAccount[];
} {
  const user = data.user ? normalizeAccount(data.user) : null;
  const accounts = (data.accounts || [])
    .map((item) => normalizeAccount(item))
    .filter((item): item is IdentityAccount => Boolean(item));
  return {
    user,
    accounts: accounts.length ? accounts : user ? [user] : [],
  };
}

export async function fetchIdentityAccounts(): Promise<{
  user: IdentityAccount | null;
  accounts: IdentityAccount[];
}> {
  try {
    const response = await identityFetch("/api/auth/me");
    if (!response.ok) return { user: null, accounts: [] };
    const data = (await response.json()) as IdentityMeResponse;
    return normalizeMe(data);
  } catch {
    return { user: null, accounts: [] };
  }
}

export async function switchIdentityAccount(sub: string): Promise<{
  user: IdentityAccount | null;
  accounts: IdentityAccount[];
} | null> {
  const response = await identityFetch("/api/auth/switch", {
    method: "POST",
    body: JSON.stringify({ sub }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as IdentityMeResponse;
  const next = normalizeMe(data);
  return next.user ? next : null;
}

export async function logoutIdentityAccount(all: boolean): Promise<{
  user: IdentityAccount | null;
  accounts: IdentityAccount[];
}> {
  const response = await identityFetch("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ all }),
  });
  if (!response.ok) return { user: null, accounts: [] };
  const data = (await response.json()) as IdentityMeResponse & {
    user?: IdentityAccount | null;
  };
  return normalizeMe({
    user: data.user ?? null,
    accounts: data.accounts,
  });
}

/** مساحة عمل نَسَب بعد SSO — مطابقة `workspacePath` في الكتالوج المجمد */
export const NASAB_WORKSPACE_PATH = "/app";

export function nasabSilentStartHref(returnTo?: string | null): string {
  const path =
    returnTo &&
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.includes("://")
      ? returnTo
      : NASAB_WORKSPACE_PATH;
  return bhdStartHref(path);
}

export function identityAddAccountHref(): string {
  return identityUrl("/login?add=1");
}

export function identityEndSessionHref(input: {
  clientId: string;
  postLogoutRedirectUri: string;
  all?: boolean;
}): string {
  const url = new URL(identityUrl("/oauth/end-session"));
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("post_logout_redirect_uri", input.postLogoutRedirectUri);
  if (input.all) url.searchParams.set("all", "1");
  return url.toString();
}

/** البريد أولاً، وإلا اسم المستخدم، وإلا الهاتف — للاختبارات والعرض */
export function accountHandle(user: {
  email?: string | null;
  username?: string | null;
  phone?: string | null;
  name?: string | null;
}) {
  return user.email || user.username || user.phone || user.name || "";
}
