import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import * as jose from "jose";
import * as cookie from "cookie";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { Errors } from "@contracts/errors";
import { verifySessionToken } from "./session";
import { users as kimiUsers } from "./platform";
import { findUserByUnionId, upsertUser } from "../queries/users";
import { getClientIp } from "../lib/client-ip";
import type { TokenResponse } from "./types";
import { isLocalDevUnionId, getLocalDevUser } from "./local-auth";
import { createOAuthState, verifyOAuthState } from "../lib/oauth-state";
import { getRequestOrigin } from "../lib/request-origin";
import { issueSessionForUser } from "../lib/issue-session";
import { rateLimit, clientRateKey } from "../lib/rate-limit";

async function exchangeAuthCode(
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.appId,
    redirect_uri: redirectUri,
    client_secret: env.appSecret,
  });

  const resp = await fetch(`${env.kimiAuthUrl}/api/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed (${resp.status}): ${text}`);
  }

  return resp.json() as Promise<TokenResponse>;
}

let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    if (!env.kimiAuthUrl) {
      throw new Error("KIMI_AUTH_URL is required for OAuth token verification");
    }
    jwks = jose.createRemoteJWKSet(
      new URL(`${env.kimiAuthUrl}/api/.well-known/jwks.json`),
    );
  }
  return jwks;
}

async function verifyAccessToken(
  accessToken: string,
): Promise<{ userId: string; clientId: string }> {
  const { payload } = await jose.jwtVerify(accessToken, getJwks());
  const userId = payload.user_id as string;
  const clientId = payload.client_id as string;
  if (!userId) {
    throw new Error("user_id missing from access token");
  }
  return { userId, clientId };
}

export async function authenticateRequest(headers: Headers) {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw Errors.forbidden("Invalid authentication token.");
  }
  if (env.devLocalAuthEnabled && isLocalDevUnionId(claim.unionId)) {
    const user = await findUserByUnionId(claim.unionId);
    if (user) return user;
    return getLocalDevUser();
  }
  const user = await findUserByUnionId(claim.unionId);
  if (!user) {
    throw Errors.forbidden("User not found. Please re-login.");
  }
  if (user.isBanned) {
    throw Errors.forbidden(user.banReason ?? "تم حظر حسابك — تواصل مع الدعم");
  }
  if ((claim.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
    throw Errors.forbidden("انتهت الجلسة — سجّل الدخول مجدداً");
  }
  return user;
}

export function createKimiStartHandler() {
  return (c: Context) => {
    const ip = getClientIp(c.req.raw.headers);
    const rl = rateLimit({ key: clientRateKey("oauth-kimi", ip), limit: 30, windowMs: 60_000 });
    if (!rl.ok) return c.json({ error: "Too many requests" }, 429);

    const origin = getRequestOrigin(c.req.raw.headers, c.req.url);
    const redirectUri = `${origin}/api/oauth/callback`;
    const state = createOAuthState("kimi", redirectUri, origin);

    const url = new URL(`${env.kimiAuthUrl}/api/oauth/authorize`);
    url.searchParams.set("client_id", env.appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "profile");
    url.searchParams.set("state", state);

    return c.redirect(url.toString(), 302);
  };
}

export function createOAuthCallbackHandler() {
  return async (c: Context) => {
    const code = c.req.query("code");
    const state = c.req.query("state");
    const error = c.req.query("error");
    const errorDescription = c.req.query("error_description");

    if (error) {
      if (error === "access_denied") {
        return c.redirect("/", 302);
      }
      return c.json({ error, error_description: errorDescription }, 400);
    }

    if (!code || !state) {
      return c.json({ error: "code and state are required" }, 400);
    }

    const origin = getRequestOrigin(c.req.raw.headers, c.req.url);
    const verified = verifyOAuthState(state, "kimi", origin);
    if (!verified) {
      return c.json({ error: "Invalid OAuth state" }, 400);
    }

    try {
      const tokenResp = await exchangeAuthCode(code, verified.redirectUri);
      const { userId } = await verifyAccessToken(tokenResp.access_token);
      const userProfile = await kimiUsers.getProfile(tokenResp.access_token);
      if (!userProfile) {
        throw new Error("Failed to fetch user profile from Kimi Open");
      }

      await upsertUser({
        unionId: userId,
        name: userProfile.name,
        avatar: userProfile.avatar_url,
        lastSignInAt: new Date(),
        lastSignInIp: getClientIp(c.req.raw.headers),
      });

      const user = await findUserByUnionId(userId);
      if (!user) throw new Error("User not found after Kimi login");
      const { ensureUserIdentity } = await import("../couponService");
      await ensureUserIdentity(user.id);

      const token = await issueSessionForUser(user.id, userId, env.appId);

      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });

      return c.redirect("/", 302);
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      if (!env.isProduction) {
        const details =
          error instanceof Error ? error.message : "Unknown OAuth error";
        return c.json({ error: "OAuth callback failed", details }, 500);
      }
      return c.json({ error: "OAuth callback failed" }, 500);
    }
  };
}

export { exchangeAuthCode, verifyAccessToken };
