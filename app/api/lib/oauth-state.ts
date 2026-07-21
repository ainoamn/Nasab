import crypto from "node:crypto";
import { env } from "./env";
import { isAllowedRedirectUri } from "./request-origin";

type OAuthProvider = "google" | "kimi";

type StatePayload = {
  nonce: string;
  provider: OAuthProvider;
  redirectUri: string;
  exp: number;
};

function sign(payload: string): string {
  return crypto.createHmac("sha256", env.appSecret).update(payload).digest("hex");
}

export function createOAuthState(
  provider: OAuthProvider,
  redirectUri: string,
  allowedOrigin: string,
): string {
  if (!isAllowedRedirectUri(redirectUri, allowedOrigin)) {
    throw new Error("redirect_uri غير مسموح");
  }
  const data: StatePayload = {
    nonce: crypto.randomBytes(16).toString("hex"),
    provider,
    redirectUri,
    exp: Date.now() + 10 * 60 * 1000,
  };
  const payload = JSON.stringify(data);
  const sig = sign(payload);
  return Buffer.from(JSON.stringify({ p: payload, s: sig })).toString("base64url");
}

export function verifyOAuthState(
  state: string,
  provider: OAuthProvider,
  allowedOrigin: string,
): { redirectUri: string } | null {
  try {
    const { p, s } = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      p: string;
      s: string;
    };
    if (sign(p) !== s) return null;
    const data = JSON.parse(p) as StatePayload;
    if (data.provider !== provider) return null;
    if (data.exp < Date.now()) return null;
    if (!isAllowedRedirectUri(data.redirectUri, allowedOrigin)) return null;
    return { redirectUri: data.redirectUri };
  } catch {
    return null;
  }
}
