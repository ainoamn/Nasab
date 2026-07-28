import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { existsSync } from "node:fs";
import path from "node:path";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler, createKimiStartHandler } from "./kimi/auth";
import {
  createGoogleAuthHandler,
  createGoogleCallbackHandler,
} from "./google/auth";
import {
  createWebhookHandler,
  createCheckoutCompleteHandler,
} from "./payments/webhooks";
import { securityHeadersMiddleware } from "./lib/security-headers";
import { Paths, PAYMENT_GATEWAY_SLUGS } from "@contracts/constants";
import { passwordLoginHandler } from "./password-login-handler";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use("*", securityHeadersMiddleware);

app.use("/api/webhooks/*", bodyLimit({ maxSize: 256 * 1024 }));
app.use("/api/trpc/*", bodyLimit({ maxSize: 5 * 1024 * 1024 }));
app.use("/api/*", bodyLimit({ maxSize: 2 * 1024 * 1024 }));

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    ts: Date.now(),
    build: process.env.NASAB_BUILD_SHA || null,
  }),
);

/** Launch diagnostics — no secrets, only presence flags. */
app.get("/api/diag", (c) => {
  const url = process.env.DATABASE_URL || "";
  return c.json({
    ok: true,
    vercel: Boolean(process.env.VERCEL),
    vercelEnv: process.env.VERCEL_ENV || null,
    nasabServerless: process.env.NASAB_SERVERLESS || null,
    nodeEnv: process.env.NODE_ENV || null,
    cwd: process.cwd(),
    build: process.env.NASAB_BUILD_SHA || null,
    builtAt: process.env.NASAB_BUILD_TIME || null,
    dbConfigured: Boolean(url),
    dbIsPostgres: /^postgres(ql)?:\/\//i.test(url),
    dbHost: (() => {
      try {
        return url ? new URL(url).host : null;
      } catch {
        return "parse-error";
      }
    })(),
    sidecar: existsSync(path.join(process.cwd(), "db-pg.cjs")),
    hasAppSecret: Boolean(process.env.APP_SECRET),
    passwordLoginConfigured: Boolean(env.passwordLoginEmail),
    hasAppPublicUrl: Boolean(env.appPublicUrl),
    hasAllowedOrigins: env.allowedOrigins.length > 0,
  });
});

app.post("/api/auth/password-login", (c) => passwordLoginHandler(c));
app.post("/api/auth/ping", (c) => c.json({ ok: true, ts: Date.now() }));

app.get("/api/oauth/kimi/start", createKimiStartHandler());
app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.get("/api/oauth/google", createGoogleAuthHandler());
app.get("/api/oauth/google/callback", createGoogleCallbackHandler());
app.get("/api/checkout/complete", createCheckoutCompleteHandler());
for (const slug of PAYMENT_GATEWAY_SLUGS) {
  app.post(`/api/webhooks/${slug}`, createWebhookHandler());
}
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

/** Long-running Node server (Docker / VPS). Skip on Vercel serverless. */
const shouldListen =
  env.isProduction &&
  !process.env.VERCEL &&
  !process.env.VERCEL_ENV &&
  process.env.NASAB_SERVERLESS !== "1";

if (shouldListen) {
  void (async () => {
    if (!env.ownerUnionId) {
      if (env.bootstrapFirstAdmin) {
        console.warn(
          "[nasab] OWNER_UNION_ID empty — BOOTSTRAP_FIRST_ADMIN is on: first login becomes admin",
        );
      } else {
        console.warn(
          "[nasab] OWNER_UNION_ID is empty — no user will be auto-promoted to admin on first login",
        );
      }
    }
    if (!env.appSecret || env.appSecret.length < 32) {
      console.warn(
        "[nasab] APP_SECRET should be at least 32 characters in production",
      );
    }
    if (!env.appPublicUrl) {
      console.warn("[nasab] APP_PUBLIC_URL is empty — OAuth redirects may fail");
    }

    try {
      const { ensurePlatformDefaults } = await import("./seedDefaults");
      await ensurePlatformDefaults();
      console.log("[nasab] platform defaults ready (plans, gateways, settings)");
    } catch (err) {
      console.error("[nasab] failed to seed platform defaults:", err);
      throw err;
    }

    const { serve } = await import("@hono/node-server");
    const { serveStaticFiles } = await import("./lib/vite");
    serveStaticFiles(app);

    const port = parseInt(process.env.PORT || "3000");
    serve({ fetch: app.fetch, port }, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  })();
}
