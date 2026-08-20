import { describe, expect, it } from "vitest";
import { Session } from "@contracts/constants";

describe("Session idle window", () => {
  it("matches the 48-hour sliding idle in the unified login guide", () => {
    expect(Session.maxAgeMs).toBe(48 * 60 * 60 * 1000);
    expect(Session.cookieName).toBe("kimi_sid");
  });
});
