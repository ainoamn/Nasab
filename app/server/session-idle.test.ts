import { describe, expect, it } from "vitest";
import { Session } from "@contracts/constants";

describe("Session policy", () => {
  it("keeps the product session 400 days or until explicit logout", () => {
    expect(Session.maxAgeMs).toBe(400 * 24 * 60 * 60 * 1000);
    expect(Session.cookieName).toBe("kimi_sid");
  });
});
