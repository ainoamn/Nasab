import { z } from "zod";
import * as cookie from "cookie";
import { TRPCError } from "@trpc/server";
import { Session } from "@contracts/constants";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { signSessionToken } from "./kimi/session";
import { LOCAL_DEV_UNION_ID } from "./kimi/local-auth";
import { upsertUser, findUserByUnionId } from "./queries/users";
import { getClientIp } from "./lib/client-ip";
import { ensureUserIdentity } from "./couponService";
import { isGoogleAuthEnabled } from "./google/auth";

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

      const token = await signSessionToken({
        unionId: LOCAL_DEV_UNION_ID,
        clientId: env.appId || "local-dev",
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
