import crypto from "node:crypto";
import * as jose from "jose";
import { env } from "./env";

export const BHD_OAUTH_STATE_COOKIE = "bhd_oauth_state";
export const BHD_IDENTITY_SPEC = "bhd-identity.v1";
export const BHD_OAUTH_SCOPES = "openid profile email";
export const BHD_CLIENT_ID = "bhd-nasab";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BhdOauthState = {
  state: string;
  nonce: string;
  verifier: string;
  returnTo: string;
  redirectUri: string;
};

export type BhdIdClaims = {
  sub: string;
  email: string;
  emailVerified: true;
  name: string | null;
  picture: string | null;
  preferredUsername: string | null;
  phoneNumber: string | null;
};

function liveAppSecret(): string {
  return process.env.APP_SECRET?.trim() || env.appSecret;
}

function liveIdentityTokenSecret(): string {
  return (
    process.env.BHD_IDENTITY_TOKEN_SECRET?.trim() || env.bhdIdentityTokenSecret
  );
}

export function isBhdSsoEnabled(): boolean {
  const issuer =
    process.env.BHD_IDENTITY_ISSUER?.trim() || env.bhdIdentityIssuer;
  const clientId =
    process.env.BHD_OAUTH_CLIENT_ID?.trim() || env.bhdOauthClientId;
  const secret =
    process.env.BHD_OAUTH_CLIENT_SECRET?.trim() || env.bhdOauthClientSecret;
  return Boolean(issuer && clientId && secret);
}

export function bhdUnionId(sub: string): string {
  return `bhd:${sub}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isBhdSub(value: string): boolean {
  return UUID_RE.test(value.trim());
}

/** Relative path only — reject absolute URLs and protocol-relative. */
export function isSafeReturnTo(value: string | null | undefined): boolean {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("://") || value.includes("\\")) return false;
  return value.length <= 512;
}

export function defaultReturnTo(): string {
  return "/dashboard";
}

export function randomUrlToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function sha256Base64Url(value: string): string {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomUrlToken(48);
  return { verifier, challenge: sha256Base64Url(verifier) };
}

function signPayload(payload: string): string {
  return crypto.createHmac("sha256", liveAppSecret()).update(payload).digest("hex");
}

export function encodeOauthStateCookie(data: BhdOauthState): string {
  const payload = JSON.stringify(data);
  return Buffer.from(JSON.stringify({ p: payload, s: signPayload(payload) })).toString(
    "base64url",
  );
}

export function decodeOauthStateCookie(raw: string | undefined): BhdOauthState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      p?: string;
      s?: string;
    };
    if (!parsed.p || !parsed.s || signPayload(parsed.p) !== parsed.s) return null;
    const data = JSON.parse(parsed.p) as BhdOauthState;
    if (
      typeof data.state !== "string" ||
      typeof data.nonce !== "string" ||
      typeof data.verifier !== "string" ||
      typeof data.returnTo !== "string" ||
      typeof data.redirectUri !== "string"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function oauthStateCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "Lax" as const,
    path: "/",
    maxAge: 5 * 60,
  };
}

export function bhdAuthorizeUrl(input: {
  issuer: string;
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  challenge: string;
}): string {
  const url = new URL("/oauth/authorize", `${input.issuer}/`);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", BHD_OAUTH_SCOPES);
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("code_challenge", input.challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function bhdEndSessionUrl(input: {
  issuer: string;
  clientId: string;
  postLogoutRedirectUri: string;
}): string {
  const url = new URL("/oauth/end-session", `${input.issuer}/`);
  url.searchParams.set("post_logout_redirect_uri", input.postLogoutRedirectUri);
  url.searchParams.set("client_id", input.clientId);
  return url.toString();
}

export function bhdIdentityIssuer(): string {
  return (
    process.env.BHD_IDENTITY_ISSUER?.trim() || env.bhdIdentityIssuer
  ).replace(/\/$/, "");
}

export function bhdOauthClientId(): string {
  return process.env.BHD_OAUTH_CLIENT_ID?.trim() || env.bhdOauthClientId || BHD_CLIENT_ID;
}

export function bhdOauthClientSecret(): string {
  return process.env.BHD_OAUTH_CLIENT_SECRET?.trim() || env.bhdOauthClientSecret;
}

export function bhdRedirectUri(origin: string): string {
  const configured =
    process.env.BHD_OAUTH_REDIRECT_URI?.trim() || env.bhdOauthRedirectUri;
  if (configured) return configured.replace(/\/$/, "");
  return `${origin.replace(/\/$/, "")}/api/auth/bhd/callback`;
}

export function bhdPostLogoutRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/`;
}

type CachedJwks = {
  uri: string;
  jwks: ReturnType<typeof jose.createRemoteJWKSet>;
  loadedAt: number;
};

let cachedJwks: CachedJwks | null = null;
const JWKS_CACHE_MS = 10 * 60 * 1000;

function jwksFor(issuer: string) {
  const uri = `${issuer.replace(/\/$/, "")}/oauth/jwks.json`;
  const now = Date.now();
  if (cachedJwks && cachedJwks.uri === uri && now - cachedJwks.loadedAt < JWKS_CACHE_MS) {
    return cachedJwks.jwks;
  }
  const jwks = jose.createRemoteJWKSet(new URL(uri));
  cachedJwks = { uri, jwks, loadedAt: now };
  return jwks;
}

export function assertIdTokenClaims(
  payload: jose.JWTPayload,
  expected: { issuer: string; audience: string; nonce: string },
): BhdIdClaims {
  if (payload.iss !== expected.issuer) {
    throw new Error("invalid_issuer");
  }
  const aud = payload.aud;
  const audienceOk = Array.isArray(aud)
    ? aud.includes(expected.audience)
    : aud === expected.audience;
  if (!audienceOk) {
    throw new Error("invalid_audience");
  }
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) {
    throw new Error("token_expired");
  }
  if (payload.nonce !== expected.nonce) {
    throw new Error("invalid_nonce");
  }
  if (typeof payload.sub !== "string" || !isBhdSub(payload.sub)) {
    throw new Error("invalid_sub");
  }
  if (typeof payload.email !== "string" || !payload.email.includes("@")) {
    throw new Error("invalid_email");
  }
  if (payload.email_verified !== true) {
    throw new Error("email_unverified");
  }
  return {
    sub: payload.sub,
    email: normalizeEmail(payload.email),
    emailVerified: true,
    name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
    preferredUsername:
      typeof payload.preferred_username === "string"
        ? payload.preferred_username
        : null,
    phoneNumber:
      typeof payload.phone_number === "string" ? payload.phone_number : null,
  };
}

export async function verifyBhdIdToken(
  idToken: string,
  expected: { issuer: string; audience: string; nonce: string },
): Promise<BhdIdClaims> {
  const header = jose.decodeProtectedHeader(idToken);
  const alg = header.alg;
  const verifyOpts = {
    issuer: expected.issuer,
    audience: expected.audience,
  };

  let payload: jose.JWTPayload;
  if (alg === "RS256") {
    const { payload: verified } = await jose.jwtVerify(
      idToken,
      jwksFor(expected.issuer),
      { ...verifyOpts, algorithms: ["RS256"] },
    );
    payload = verified;
  } else if (alg === "HS256") {
    const secret = liveIdentityTokenSecret();
    if (!secret) {
      throw new Error("missing_hs256_secret");
    }
    const { payload: verified } = await jose.jwtVerify(
      idToken,
      new TextEncoder().encode(secret),
      { ...verifyOpts, algorithms: ["HS256"] },
    );
    payload = verified;
  } else {
    throw new Error("unsupported_alg");
  }

  return assertIdTokenClaims(payload, expected);
}

export type LinkableUser = {
  unionId: string;
  email: string | null;
  bhdSub?: string | null;
};

/** Section 7: verified Google/password emails only. Never username-only. */
export function canLinkByVerifiedEmail(
  user: LinkableUser,
  email: string,
): boolean {
  if (!user.email) return false;
  if (normalizeEmail(user.email) !== normalizeEmail(email)) return false;
  return user.unionId.startsWith("google:") || user.unionId.startsWith("password:");
}

export function issuerConnectSrc(issuer: string): string {
  try {
    return new URL(issuer).origin;
  } catch {
    return "https://id.bhd-om.com";
  }
}
