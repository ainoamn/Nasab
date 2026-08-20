import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createAuthMeHandler } from "./auth-me";

describe("GET /api/auth/me", () => {
  it("returns 401 without a session cookie", async () => {
    const app = new Hono();
    app.get("/api/auth/me", createAuthMeHandler());
    const res = await app.request("http://localhost/api/auth/me");
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "unauthorized" });
  });
});
