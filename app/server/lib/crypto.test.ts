import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptSecret, decryptSecret, encryptGatewayConfig, decryptGatewayConfig } from "./crypto";

describe("crypto", () => {
  const prev = process.env;

  beforeEach(() => {
    process.env = { ...prev, APP_SECRET: "gateway-encryption-test-key" };
  });

  afterEach(() => {
    process.env = prev;
  });

  it("round-trips secret encryption", () => {
    const plain = "sk_live_super_secret";
    const enc = encryptSecret(plain);
    expect(enc).not.toBe(plain);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("encrypts only secret-like gateway fields", () => {
    const config = {
      publishableKey: "pk_test",
      secretKey: "sk_test",
      webhookSecret: "whsec_abc",
    };
    const enc = encryptGatewayConfig(config);
    expect(enc.publishableKey).toBe("pk_test");
    expect(enc.secretKey).not.toBe("sk_test");
    expect(decryptGatewayConfig(enc)).toEqual(config);
  });
});
