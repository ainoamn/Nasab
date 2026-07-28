import * as cookie from "cookie";
import { Session } from "@contracts/constants";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { signSessionToken } from "./kimi/session";
import { LOCAL_DEV_UNION_ID } from "./kimi/local-auth";
import { upsertUser, findUserByUnionId } from "./queries/users";
import { getClientIp } from "./lib/client-ip";
import { ensureUserIdentity } from "./couponService";
import { issueSessionForUser } from "./lib/issue-session";
import { rateLimit, clientRateKey } from "./lib/rate-limit";
import { passwordLoginUnionId } from "./lib/password-login";
import type { Context } from "hono";

type LoginBody = { username?: string; password?: string };

/**
 * Direct Hono password login — bypasses tRPC `.input()` which hangs on
 * Vercel Build Output for procedures with Zod input schemas.
 */
export async function passwordLoginHandler(c: Context) {
  // Fail closed immediately when Neon is not configured on Vercel.
  if (!/^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL || env.databaseUrl || "")) {
    return c.json(
      {
        error: "db_not_configured",
        message:
          "قاعدة البيانات غير مربوطة على Vercel — أضف DATABASE_URL (Neon pooled) ثم Redeploy",
      },
      503,
    );
  }

  let body: LoginBody = {};
  try {
    body = (await c.req.json()) as LoginBody;
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const passwordLoginOn = env.passwordLoginEnabled;
  const devLoginOn = env.devLocalAuthEnabled;
  if (!passwordLoginOn && !devLoginOn) {
    return c.json({ error: "forbidden", message: "تسجيل الدخول بالبريد غير مفعّل" }, 403);
  }

  const ip = getClientIp(c.req.raw.headers);
  const rl = rateLimit({
    key: clientRateKey("login-local", ip),
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.ok) {
    return c.json({ error: "rate_limited", message: "محاولات كثيرة — حاول لاحقاً" }, 429);
  }

  const identityLower = usernameRaw.toLowerCase();
  let unionId = LOCAL_DEV_UNION_ID;
  let name = "مستخدم التطوير";
  let email = "dev@local";
  let username = usernameRaw;

  const passwordOk =
    passwordLoginOn &&
    identityLower === env.passwordLoginEmail &&
    passwordRaw === env.passwordLoginPassword;

  const devOk =
    devLoginOn &&
    usernameRaw === env.devLoginUser &&
    passwordRaw === env.devLoginPassword;

  if (passwordOk) {
    unionId = passwordLoginUnionId(env.passwordLoginEmail);
    name = "مشرف نَسَب";
    email = env.passwordLoginEmail;
    username = env.passwordLoginEmail;
  } else if (devOk) {
    // keep defaults
  } else {
    return c.json({ error: "unauthorized", message: "البريد أو كلمة المرور غير صحيحة" }, 401);
  }

  try {
    await Promise.race([
      upsertUser({
        unionId,
        name,
        email,
        username,
        role: "admin",
        plan: "print",
        lastSignInAt: new Date(),
        signInIp: ip,
        registrationIp: ip,
      }),
      new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("db-timeout")),
          process.env.VERCEL ? 12_000 : 25_000,
        );
      }),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[nasab] password login db error:", msg);
    return c.json(
      {
        error: "db_unavailable",
        message:
          msg === "db-timeout"
            ? "قاعدة البيانات لا تستجيب — تحقق من DATABASE_URL على Vercel"
            : "تعذر الاتصال بقاعدة البيانات",
      },
      503,
    );
  }

  const user = await findUserByUnionId(unionId);
  if (user) await ensureUserIdentity(user.id);

  const token = user
    ? await issueSessionForUser(user.id, unionId, env.appId || "local-dev")
    : await signSessionToken({
        unionId,
        clientId: env.appId || "local-dev",
        sessionVersion: 0,
      });

  const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
  c.header(
    "set-cookie",
    cookie.serialize(Session.cookieName, token, {
      httpOnly: cookieOpts.httpOnly,
      path: cookieOpts.path,
      sameSite: cookieOpts.sameSite?.toLowerCase() as "lax" | "none",
      secure: cookieOpts.secure,
      maxAge: Session.maxAgeMs / 1000,
    }),
  );

  return c.json({ success: true });
}
