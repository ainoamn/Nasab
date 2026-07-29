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
import { classifyDbError, sanitizeDbError } from "./lib/db-errors";
import type { Context } from "hono";

type LoginBody = { username?: string; password?: string };

async function readLoginBody(c: Context): Promise<LoginBody> {
  const ct = (c.req.header("content-type") || "").toLowerCase();

  if (ct.includes("application/x-www-form-urlencoded")) {
    const form = await Promise.race([
      c.req.parseBody(),
      new Promise<Record<string, never>>((_, reject) => {
        setTimeout(() => reject(new Error("body-timeout")), 5000);
      }),
    ]);
    return {
      username: String(form.username ?? ""),
      password: String(form.password ?? ""),
    };
  }

  const raw = await Promise.race([
    c.req.text(),
    new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error("body-timeout")), 5000);
    }),
  ]);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as LoginBody;
  } catch {
    // Fallback: treat as querystring
    const params = new URLSearchParams(raw);
    return {
      username: params.get("username") ?? undefined,
      password: params.get("password") ?? undefined,
    };
  }
}

/**
 * Direct Hono password login — bypasses tRPC `.input()` issues on Vercel.
 */
export async function passwordLoginHandler(c: Context) {
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
    body = await readLoginBody(c);
  } catch {
    return c.json({ error: "invalid_body", message: "تعذر قراءة بيانات الدخول" }, 400);
  }

  const usernameRaw = String(body.username ?? "").trim();
  const passwordRaw = String(body.password ?? "");
  if (!usernameRaw || !passwordRaw) {
    return c.json(
      { error: "missing_credentials", message: "البريد وكلمة المرور مطلوبان" },
      400,
    );
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
    return c.json(
      { error: "unauthorized", message: "البريد أو كلمة المرور غير صحيحة" },
      401,
    );
  }

  let user: Awaited<ReturnType<typeof findUserByUnionId>> | undefined;
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
    user = await findUserByUnionId(unionId);
    if (user) await ensureUserIdentity(user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const detail = sanitizeDbError(err);
    const kind = msg === "db-timeout" ? "timeout" : classifyDbError(err);
    console.error("[nasab] password login db error:", kind, detail);
    const message =
      kind === "timeout" || msg === "db-timeout"
        ? "قاعدة البيانات لا تستجيب — تحقق من DATABASE_URL على Vercel"
        : kind === "auth"
          ? "رفضت Neon المصادقة — حدّث DATABASE_URL (كلمة مرور القاعدة) على Vercel ثم Redeploy"
          : kind === "schema"
            ? "جداول القاعدة غير جاهزة — شغّل db:push / admin:ensure على Neon"
            : "تعذر الاتصال بقاعدة البيانات";
    return c.json(
      {
        error: "db_unavailable",
        kind,
        detail,
        message,
      },
      503,
    );
  }

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
