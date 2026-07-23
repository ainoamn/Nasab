import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

describe("getSessionCookieOptions", () => {
  it("uses Secure + SameSite=None in production on a real host", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const opts = getSessionCookieOptions(
        new Headers({ host: "nasab.example.com" }),
      );
      expect(opts.secure).toBe(true);
      expect(opts.sameSite).toBe("None");
      expect(opts.httpOnly).toBe(true);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("keeps Lax cookies on localhost for HTTP Vite/dev", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const opts = getSessionCookieOptions(
        new Headers({ host: "localhost:5173" }),
      );
      expect(opts.secure).toBe(false);
      expect(opts.sameSite).toBe("Lax");
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
