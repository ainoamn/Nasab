import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createAdminEntryHandler } from "./admin-entry";

describe("GET /api/auth/admin-entry", () => {
  it("forwards to BHD start with /admin returnTo by default", async () => {
    const app = new Hono();
    app.get("/api/auth/admin-entry", createAdminEntryHandler());
    const res = await app.request("http://localhost/api/auth/admin-entry");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "/api/auth/bhd/start?returnTo=%2Fadmin",
    );
  });

  it("accepts a safe next path under /admin", async () => {
    const app = new Hono();
    app.get("/api/auth/admin-entry", createAdminEntryHandler());
    const res = await app.request(
      "http://localhost/api/auth/admin-entry?next=%2Fadmin%2Fusers",
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(
      "/api/auth/bhd/start?returnTo=%2Fadmin%2Fusers",
    );
  });

  it("rejects unsafe next and falls back to /admin", async () => {
    const app = new Hono();
    app.get("/api/auth/admin-entry", createAdminEntryHandler());
    const res = await app.request(
      "http://localhost/api/auth/admin-entry?next=https://evil.example/",
    );
    expect(res.headers.get("location")).toBe(
      "/api/auth/bhd/start?returnTo=%2Fadmin",
    );
  });
});
