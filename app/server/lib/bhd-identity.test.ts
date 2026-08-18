import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as jose from "jose";

describe("bhd-identity helpers", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...prev,
      APP_SECRET: "test-secret-for-bhd-oauth-state-32chars",
      BHD_IDENTITY_ISSUER: "https://id.bhd-om.com",
      BHD_OAUTH_CLIENT_ID: "bhd-nasab",
      BHD_OAUTH_CLIENT_SECRET: "test-client-secret",
      BHD_IDENTITY_TOKEN_SECRET: "identity-hs256-secret",
    };
  });

  afterEach(() => {
    process.env = prev;
  });

  it("creates PKCE S256 challenge from verifier", async () => {
    const { createPkce, sha256Base64Url } = await import("./bhd-identity");
    const { verifier, challenge } = createPkce();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(challenge).toBe(sha256Base64Url(verifier));
  });

  it("accepts only relative returnTo paths", async () => {
    const { isSafeReturnTo } = await import("./bhd-identity");
    expect(isSafeReturnTo("/dashboard")).toBe(true);
    expect(isSafeReturnTo("/invite/abc")).toBe(true);
    expect(isSafeReturnTo("https://evil.example/")).toBe(false);
    expect(isSafeReturnTo("//evil.example")).toBe(false);
    expect(isSafeReturnTo("/\\evil")).toBe(false);
  });

  it("round-trips signed oauth state cookie", async () => {
    const { encodeOauthStateCookie, decodeOauthStateCookie } = await import(
      "./bhd-identity"
    );
    const data = {
      state: "s",
      nonce: "n",
      verifier: "v".repeat(43),
      returnTo: "/dashboard",
      redirectUri: "https://nasab-mu.vercel.app/api/auth/bhd/callback",
    };
    const raw = encodeOauthStateCookie(data);
    expect(decodeOauthStateCookie(raw)).toEqual(data);
    expect(decodeOauthStateCookie(`${raw}tampered`)).toBeNull();
  });

  it("rejects id_token with wrong aud, nonce, or unverified email", async () => {
    const { assertIdTokenClaims } = await import("./bhd-identity");
    const sub = "11111111-1111-4111-8111-111111111111";
    const base = {
      iss: "https://id.bhd-om.com",
      aud: "bhd-nasab",
      sub,
      exp: Math.floor(Date.now() / 1000) + 600,
      iat: Math.floor(Date.now() / 1000),
      nonce: "abc",
      email: "user@example.com",
      email_verified: true,
    };
    const expected = {
      issuer: "https://id.bhd-om.com",
      audience: "bhd-nasab",
      nonce: "abc",
    };
    expect(assertIdTokenClaims(base, expected).sub).toBe(sub);
    expect(() =>
      assertIdTokenClaims({ ...base, aud: "bhd-wazen" }, expected),
    ).toThrow("invalid_audience");
    expect(() =>
      assertIdTokenClaims({ ...base, nonce: "other" }, expected),
    ).toThrow("invalid_nonce");
    expect(() =>
      assertIdTokenClaims({ ...base, email_verified: false }, expected),
    ).toThrow("email_unverified");
    expect(assertIdTokenClaims({ ...base, email_verified: "true" }, expected).email).toBe(
      "user@example.com",
    );
  });

  it("verifies HS256 id_token with identity secret", async () => {
    const { verifyBhdIdToken } = await import("./bhd-identity");
    const secret = new TextEncoder().encode("identity-hs256-secret");
    const sub = "22222222-2222-4222-8222-222222222222";
    const nonce = "nonce-value";
    const idToken = await new jose.SignJWT({
      email: "linked@example.com",
      email_verified: true,
      name: "Linked User",
      nonce,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("https://id.bhd-om.com")
      .setAudience("bhd-nasab")
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(secret);

    const claims = await verifyBhdIdToken(idToken, {
      issuer: "https://id.bhd-om.com",
      audience: "bhd-nasab",
      nonce,
    });
    expect(claims.email).toBe("linked@example.com");
    expect(claims.sub).toBe(sub);
  });

  it("links only google/password verified emails", async () => {
    const { canLinkByVerifiedEmail } = await import("./bhd-identity");
    expect(
      canLinkByVerifiedEmail(
        { unionId: "google:abc", email: "A@Example.com" },
        "a@example.com",
      ),
    ).toBe(true);
    expect(
      canLinkByVerifiedEmail(
        { unionId: "password:admin@bhd.om", email: "admin@bhd.om" },
        "admin@bhd.om",
      ),
    ).toBe(true);
    expect(
      canLinkByVerifiedEmail(
        { unionId: "bhd:11111111-1111-4111-8111-111111111111", email: "a@example.com" },
        "a@example.com",
      ),
    ).toBe(false);
    expect(
      canLinkByVerifiedEmail(
        { unionId: "google:abc", email: "other@example.com" },
        "a@example.com",
      ),
    ).toBe(false);
  });
});
