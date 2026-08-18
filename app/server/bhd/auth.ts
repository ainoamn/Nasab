import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { env } from "../lib/env";
import { getSessionCookieOptions } from "../lib/cookies";
import { Session } from "@contracts/constants";
import { getClientIp } from "../lib/client-ip";
import { ensureUserIdentity } from "../couponService";
import { getBrowserOrigin } from "../lib/request-origin";
import { issueSessionForUser } from "../lib/issue-session";
import { rateLimit, clientRateKey } from "../lib/rate-limit";
import {
  BHD_OAUTH_STATE_COOKIE,
  bhdAuthorizeUrl,
  bhdEndSessionUrl,
  bhdIdentityIssuer,
  bhdOauthClientId,
  bhdOauthClientSecret,
  bhdPostLogoutRedirectUri,
  bhdRedirectUri,
  createPkce,
  decodeOauthStateCookie,
  defaultReturnTo,
  encodeOauthStateCookie,
  isBhdIdentityReady,
  isSafeReturnTo,
  oauthStateCookieOptions,
  randomUrlToken,
  verifyBhdIdToken,
} from "../lib/bhd-identity";
import { linkOrCreateBhdUser } from "../queries/bhd-users";
import { incrementSessionVersion } from "../queries/users";
import { authenticateRequest } from "../kimi/auth";

function oauthCookieOpts(headers: Headers) {
  const host = headers.get("host") || "";
  const localhost =
    host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
  const secure = process.env.NODE_ENV === "production" && !localhost;
  return oauthStateCookieOptions(secure);
}

function loginErrorRedirect(code = "bhd") {
  return `/login?error=${encodeURIComponent(code)}`;
}

export function createBhdStartHandler() {
  return (c: Context) => {
    if (!isBhdIdentityReady()) {
      return c.redirect(loginErrorRedirect(), 302);
    }

    const ip = getClientIp(c.req.raw.headers);
    const rl = rateLimit({
      key: clientRateKey("oauth-bhd", ip),
      limit: 10,
      windowMs: 60_000,
    });
    if (!rl.ok) return c.json({ error: "Too many requests" }, 429);

    const origin = getBrowserOrigin(c.req.raw.headers, c.req.url);
    const redirectUri = bhdRedirectUri(origin);
    const issuer = bhdIdentityIssuer();
    const clientId = bhdOauthClientId();
    const requested = c.req.query("returnTo");
    const returnTo = isSafeReturnTo(requested) ? requested! : defaultReturnTo();
    const state = randomUrlToken();
    const nonce = randomUrlToken();
    const { verifier, challenge } = createPkce();

    const authorize = bhdAuthorizeUrl({
      issuer,
      clientId,
      redirectUri,
      state,
      nonce,
      challenge,
    });

    setCookie(
      c,
      BHD_OAUTH_STATE_COOKIE,
      encodeOauthStateCookie({ state, nonce, verifier, returnTo, redirectUri }),
      oauthCookieOpts(c.req.raw.headers),
    );
    return c.redirect(authorize, 302);
  };
}

export function createBhdCallbackHandler() {
  return async (c: Context) => {
    const cookieOpts = oauthCookieOpts(c.req.raw.headers);
    const saved = decodeOauthStateCookie(getCookie(c, BHD_OAUTH_STATE_COOKIE));
    deleteCookie(c, BHD_OAUTH_STATE_COOKIE, cookieOpts);

    const error = c.req.query("error");
    const code = c.req.query("code");
    const state = c.req.query("state");

    if (!isBhdIdentityReady()) {
      return c.redirect(loginErrorRedirect(), 302);
    }
    if (error || !saved || !code || !state || saved.state !== state) {
      return c.redirect(loginErrorRedirect(), 302);
    }

    const issuer = bhdIdentityIssuer();
    const clientId = bhdOauthClientId();

    try {
      const tokenResp = await fetch(`${issuer}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: saved.redirectUri,
          client_id: clientId,
          client_secret: bhdOauthClientSecret(),
          code_verifier: saved.verifier,
        }),
      });
      if (!tokenResp.ok) {
        console.error("[BHD OIDC] token", tokenResp.status, await tokenResp.text());
        return c.redirect(loginErrorRedirect(), 302);
      }
      const tokens = (await tokenResp.json()) as {
        id_token?: string;
        access_token?: string;
      };
      if (!tokens.id_token) {
        return c.redirect(loginErrorRedirect(), 302);
      }

      const claims = await verifyBhdIdToken(
        tokens.id_token,
        {
          issuer,
          audience: clientId,
          nonce: saved.nonce,
        },
        tokens.access_token,
      );

      const user = await linkOrCreateBhdUser({
        sub: claims.sub,
        email: claims.email,
        name: claims.name,
        picture: claims.picture,
        preferredUsername: claims.preferredUsername,
        phoneNumber: claims.phoneNumber,
        ip: getClientIp(c.req.raw.headers),
      });
      await ensureUserIdentity(user.id);

      const token = await issueSessionForUser(
        user.id,
        user.unionId,
        env.appId || "nasab-app",
      );
      const sessionCookie = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...sessionCookie,
        maxAge: Session.maxAgeMs / 1000,
      });

      const dest = isSafeReturnTo(saved.returnTo)
        ? saved.returnTo
        : defaultReturnTo();
      return c.redirect(dest, 302);
    } catch (err) {
      console.error("[BHD OIDC]", err);
      return c.redirect(loginErrorRedirect(), 302);
    }
  };
}

export function createBhdLogoutHandler() {
  return async (c: Context) => {
    const origin = getBrowserOrigin(c.req.raw.headers, c.req.url);
    const sessionOpts = getSessionCookieOptions(c.req.raw.headers);
    try {
      const user = await authenticateRequest(c.req.raw.headers);
      await incrementSessionVersion(user.id);
    } catch {
      /* already signed out */
    }
    setCookie(c, Session.cookieName, "", {
      ...sessionOpts,
      maxAge: 0,
    });

    if (!isBhdIdentityReady()) {
      return c.redirect("/login", 302);
    }
    return c.redirect(
      bhdEndSessionUrl({
        issuer: bhdIdentityIssuer(),
        clientId: bhdOauthClientId(),
        postLogoutRedirectUri: bhdPostLogoutRedirectUri(origin),
      }),
      302,
    );
  };
}

export function bhdEndSessionUrlForOrigin(origin: string): string | undefined {
  if (!isBhdIdentityReady()) return undefined;
  return bhdEndSessionUrl({
    issuer: bhdIdentityIssuer(),
    clientId: bhdOauthClientId(),
    postLogoutRedirectUri: bhdPostLogoutRedirectUri(origin),
  });
}
