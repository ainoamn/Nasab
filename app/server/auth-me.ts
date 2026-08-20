import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { authenticateRequest } from "./kimi/auth";
import { verifySessionToken } from "./kimi/session";
import { issueSessionForUser } from "./lib/issue-session";
import { getSessionCookieOptions } from "./lib/cookies";

/** يجدد كوكي `kimi_sid` 48 ساعة عند الاستخدام — الدليل المرجعي 0.2 */
export function createAuthMeHandler() {
  return async (c: Context) => {
    try {
      const user = await authenticateRequest(c.req.raw.headers);
      const cookies = cookie.parse(c.req.header("cookie") || "");
      const claim = await verifySessionToken(cookies[Session.cookieName] || "");
      if (!claim) {
        return c.json({ error: "unauthorized" }, 401);
      }
      const token = await issueSessionForUser(
        user.id,
        user.unionId,
        claim.clientId,
      );
      const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
      setCookie(c, Session.cookieName, token, {
        ...cookieOpts,
        maxAge: Session.maxAgeMs / 1000,
      });
      return c.json({ ok: true });
    } catch {
      return c.json({ error: "unauthorized" }, 401);
    }
  };
}
