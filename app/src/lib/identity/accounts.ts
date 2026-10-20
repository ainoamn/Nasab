import { DEFAULT_IDENTITY_ISSUER } from "./issuer";
import { bhdStartHref } from "@/const";

export type IdentityAccount = {
  id: string;
  name: string;
  email: string;
  picture: string | null;
};

type IdentityMeResponse = {
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

export async function fetchIdentityAccounts(): Promise<{
  user: IdentityAccount | null;
  accounts: IdentityAccount[];
}> {
  try {
    const response = await identityFetch("/api/auth/me");
    if (!response.ok) return { user: null, accounts: [] };
    const data = (await response.json()) as IdentityMeResponse;
    const user = data.user ?? null;
    const accounts = data.accounts?.length
      ? data.accounts
      : user
        ? [user]
        : [];
    return { user, accounts };
  } catch {
    return { user: null, accounts: [] };
  }
}

export async function switchIdentityAccount(sub: string): Promise<boolean> {
  const response = await identityFetch("/api/auth/switch", {
    method: "POST",
    body: JSON.stringify({ sub }),
  });
  return response.ok;
}

export async function logoutIdentityAccount(all: boolean): Promise<IdentityAccount | null> {
  const response = await identityFetch("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({ all }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { user?: IdentityAccount | null };
  return data.user ?? null;
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
