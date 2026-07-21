import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createOAuthState, verifyOAuthState } from "./oauth-state";

describe("oauth-state", () => {
  const prev = process.env;

  beforeEach(() => {
    process.env = { ...prev, APP_SECRET: "test-secret-for-oauth-state" };
  });

  afterEach(() => {
    process.env = prev;
  });

  it("creates and verifies signed state", () => {
    const redirectUri = "http://localhost:5173/api/oauth/callback";
    const state = createOAuthState("kimi", redirectUri, "http://localhost:5173");
    const verified = verifyOAuthState(state, "kimi", "http://localhost:5173");
    expect(verified?.redirectUri).toBe(redirectUri);
  });

  it("rejects wrong provider", () => {
    const redirectUri = "http://localhost:5173/api/oauth/google/callback";
    const state = createOAuthState("google", redirectUri, "http://localhost:5173");
    expect(verifyOAuthState(state, "kimi", "http://localhost:5173")).toBeNull();
  });

  it("rejects disallowed redirect", () => {
    const redirectUri = "https://evil.example/callback";
    expect(() =>
      createOAuthState("kimi", redirectUri, "http://localhost:5173"),
    ).toThrow();
  });
});
