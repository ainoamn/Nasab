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

export const authRouter = createRouter({
  config: publicQuery.query(() => ({
    googleEnabled: isGoogleAuthEnabled(),
    devLocalAuth: env.devLocalAuthEnabled,
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
      if (!env.devLocalAuthEnabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "تسجيل الدخول المحلي غير مفعّل",
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

      if (
        input.username !== env.devLoginUser ||
        input.password !== env.devLoginPassword
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "اسم المستخدم أو كلمة المرور غير صحيحة",
        });
      }

      await upsertUser({
        unionId: LOCAL_DEV_UNION_ID,
        name: "مستخدم التطوير",
        email: "dev@local",
        username: input.username,
        role: "admin",
        lastSignInAt: new Date(),
        signInIp: getClientIp(ctx.req.headers),
      });
      const user = await findUserByUnionId(LOCAL_DEV_UNION_ID);
      if (user) await ensureUserIdentity(user.id);

      const token = user
        ? await issueSessionForUser(user.id, LOCAL_DEV_UNION_ID, env.appId || "local-dev")
        : await signSessionToken({
            unionId: LOCAL_DEV_UNION_ID,
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
