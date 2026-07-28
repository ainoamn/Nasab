import { z } from "zod";
import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { signSessionToken } from "./kimi/session";
import { LOCAL_DEV_UNION_ID } from "./kimi/local-auth";
import { upsertUser, findUserByUnionId, incrementSessionVersion } from "./queries/users";
import { getClientIp } from "./lib/client-ip";
import { ensureUserIdentity } from "./couponService";
import { isGoogleAuthEnabled } from "./google/auth";
import { issueSessionForUser } from "./lib/issue-session";
import { rateLimit, clientRateKey } from "./lib/rate-limit";

function passwordUnionId(email: string): string {
  return `password:${email.toLowerCase()}`;
}

export const authRouter = createRouter({
  config: publicQuery.query(() => ({
    googleEnabled: isGoogleAuthEnabled(),
    devLocalAuth: env.devLocalAuthEnabled,
    passwordLogin: env.passwordLoginEnabled,
  })),
  me: authedQuery.query((opts) => opts.ctx.user),
  loginLocal: publicQuery
    .input(
      z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const passwordLoginOn = env.passwordLoginEnabled;
      const devLoginOn = env.devLocalAuthEnabled;
      if (!passwordLoginOn && !devLoginOn) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "تسجيل الدخول بالبريد غير مفعّل",
        });
      }

      const ip = getClientIp(ctx.req.headers);
      const rl = rateLimit({
        key: clientRateKey("login-local", ip),
        limit: 10,
        windowMs: 15 * 60 * 1000,
      });
      if (!rl.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "محاولات كثيرة — حاول لاحقاً",
        });
      }

      const identity = input.username.trim();
      const identityLower = identity.toLowerCase();
      let unionId = LOCAL_DEV_UNION_ID;
      let name = "مستخدم التطوير";
      let email = "dev@local";
      let username = identity;

      const passwordOk =
        passwordLoginOn &&
        identityLower === env.passwordLoginEmail &&
        input.password === env.passwordLoginPassword;

      const devOk =
        devLoginOn &&
        identity === env.devLoginUser &&
        input.password === env.devLoginPassword;

      if (passwordOk) {
        unionId = passwordUnionId(env.passwordLoginEmail);
        name = env.passwordLoginEmail.split("@")[0] || "Admin";
        email = env.passwordLoginEmail;
        username = env.passwordLoginEmail;
      } else if (devOk) {
        // keep LOCAL_DEV_UNION_ID defaults
      } else {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البريد أو كلمة المرور غير صحيحة",
        });
      }

      await upsertUser({
        unionId,
        name,
        email,
        username,
        role: "admin",
        lastSignInAt: new Date(),
        signInIp: ip,
        registrationIp: ip,
      });
      const user = await findUserByUnionId(unionId);
      if (user) await ensureUserIdentity(user.id);

      const token = user
        ? await issueSessionForUser(user.id, unionId, env.appId || "local-dev")
        : await signSessionToken({
            unionId,
            clientId: env.appId || "local-dev",
            sessionVersion: 0,
          });
      const cookieOpts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, token, {
          httpOnly: cookieOpts.httpOnly,
          path: cookieOpts.path,
          sameSite: cookieOpts.sameSite?.toLowerCase() as "lax" | "none",
          secure: cookieOpts.secure,
          maxAge: Session.maxAgeMs / 1000,
        }),
      );
      return { success: true };
    }),
  logout: authedQuery.mutation(async ({ ctx }) => {
    await incrementSessionVersion(ctx.user.id);
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
