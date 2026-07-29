import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { upsertUser, findUserByUnionId } from "../queries/users";
import { getClientIp } from "../lib/client-ip";
import { ensureUserIdentity } from "../couponService";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";
import { getRequestOrigin } from "../lib/request-origin";
import { issueSessionForUser } from "../lib/issue-session";
import { rateLimit, clientRateKey } from "../lib/rate-limit";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";

function googleRedirectUri(origin: string) {
  return `${origin}/api/oauth/google/callback`;
}

export function createGoogleAuthHandler() {
  return (c: Context) => {
    if (!env.googleClientId) {
      return c.json({ error: "Google login غير مفعّل" }, 503);
    }

    const ip = getClientIp(c.req.raw.headers);
    const rl = rateLimit({ key: clientRateKey("oauth-google", ip), limit: 30, windowMs: 60_000 });
    if (!rl.ok) return c.json({ error: "Too many requests" }, 429);

    const origin = getRequestOrigin(c.req.raw.headers, c.req.url);
    const redirectUri = googleRedirectUri(origin);
    const state = createOAuthState("google", redirectUri, origin);

    const params = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "online",
      prompt: "select_account",
      state,
    });
    return c.redirect(`${GOOGLE_AUTH}?${params}`, 302);
  };
}

export function createGoogleCallbackHandler() {
  return async (c: Context) => {
    if (!env.googleClientId || !env.googleClientSecret) {
      return c.json({ error: "Google login غير مفعّل" }, 503);
    }

    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");
    if (error) return c.redirect("/login?error=google", 302);
    if (!code || !state) return c.json({ error: "code and state required" }, 400);

    const origin = getRequestOrigin(c.req.raw.headers, c.req.url);
    const verified = verifyOAuthState(state, "google", origin);
    if (!verified) return c.redirect("/login?error=google", 302);

    try {
      const tokenResp = await fetch(GOOGLE_TOKEN, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: env.googleClientId,
          client_secret: env.googleClientSecret,
          redirect_uri: verified.redirectUri,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenResp.ok) {
        throw new Error(await tokenResp.text());
      }
      const tokens = (await tokenResp.json()) as { access_token: string };
      const profileResp = await fetch(GOOGLE_USERINFO, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!profileResp.ok) throw new Error("Failed to fetch Google profile");
      const profile = (await profileResp.json()) as {
        sub: string;
        email?: string;
        name?: string;
        picture?: string;
      };

      const unionId = `google:${profile.sub}`;
      await upsertUser({
        unionId,
        name: profile.name ?? profile.email ?? "Google User",
        email: profile.email ?? null,
        avatar: profile.picture ?? null,
        lastSignInAt: new Date(),
        signInIp: getClientIp(c.req.raw.headers),
      });

      const user = await findUserByUnionId(unionId);
      if (!user) throw new Error("User not found after Google login");
      await ensureUserIdentity(user.id);

      const token = await issueSessionForUser(user.id, unionId, env.googleClientId);
      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      return c.redirect("/dashboard", 302);
    } catch (e) {
      console.error("[Google OAuth]", e);
      return c.redirect("/login?error=google", 302);
    }
  };
}

export function isGoogleAuthEnabled() {
  // Same as BHD-Pro: GIS / ID-token needs Client ID only.
  // Redirect OAuth also works when GOOGLE_CLIENT_SECRET is set.
  return Boolean(env.googleClientId);
}

type GoogleIdTokenInfo = {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
};

/** Verify Google ID token (GIS) — same flow as BHD-Pro / Hisaby */
export async function loginWithGoogleIdToken(
  c: Context,
  idToken: string,
): Promise<Response> {
  if (!env.googleClientId) {
    return c.json({ error: "google_disabled", message: "Google login غير مفعّل" }, 503);
  }

  const ip = getClientIp(c.req.raw.headers);
  const rl = rateLimit({
    key: clientRateKey("oauth-google-id", ip),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return c.json({ error: "rate_limited", message: "محاولات كثيرة" }, 429);
  }

  const infoResp = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!infoResp.ok) {
    return c.json(
      { error: "invalid_token", message: "رمز Google غير صالح" },
      401,
    );
  }
  const info = (await infoResp.json()) as GoogleIdTokenInfo;
  if (info.aud !== env.googleClientId || !info.sub) {
    return c.json(
      { error: "invalid_audience", message: "رمز Google غير مقبول" },
      401,
    );
  }
  const emailVerified =
    info.email_verified === true || info.email_verified === "true";
  if (info.email && !emailVerified) {
    return c.json(
      { error: "email_unverified", message: "بريد Google غير موثّق" },
      401,
    );
  }

  const unionId = `google:${info.sub}`;
  await upsertUser({
    unionId,
    name: info.name ?? info.email ?? "Google User",
    email: info.email ?? null,
    avatar: info.picture ?? null,
    lastSignInAt: new Date(),
    signInIp: ip,
  });

  const user = await findUserByUnionId(unionId);
  if (!user) {
    return c.json({ error: "user_missing", message: "تعذر إنشاء المستخدم" }, 500);
  }
  await ensureUserIdentity(user.id);

  const token = await issueSessionForUser(user.id, unionId, env.googleClientId);
  const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
  setCookie(c, Session.cookieName, token, {
    ...cookieOpts,
    maxAge: Session.maxAgeMs / 1000,
  });

  return c.json({ success: true });
}

export function createGoogleIdTokenHandler() {
  return async (c: Context) => {
    let body: { credential?: string; idToken?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_body" }, 400);
    }
    const idToken = String(body.credential || body.idToken || "").trim();
    if (!idToken) {
      return c.json({ error: "missing_credential", message: "رمز Google مطلوب" }, 400);
    }
    return loginWithGoogleIdToken(c, idToken);
  };
}
