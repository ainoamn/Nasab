import { describe, expect, it } from "vitest";
import { sanitizeDatabaseUrl } from "../../db/dialect";
import { classifyDbError, sanitizeDbError } from "../lib/db-errors";

describe("sanitizeDatabaseUrl", () => {
  it("strips channel_binding without rewriting password encoding", () => {
    const raw =
      "postgresql://neondb_owner:p%40ss%2Fword@ep-x-pooler.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    const out = sanitizeDatabaseUrl(raw);
    expect(out).toContain("p%40ss%2Fword");
    expect(out).not.toContain("channel_binding");
    expect(out).toContain("sslmode=require");
  });
});

describe("db error helpers", () => {
  it("classifies auth failures", () => {
    expect(
      classifyDbError(new Error("password authentication failed for user")),
    ).toBe("auth");
  });

  it("redacts connection strings", () => {
    const msg = sanitizeDbError(
      new Error("connect postgresql://u:secret@host/db failed"),
    );
    expect(msg).toContain("postgresql://***");
    expect(msg).not.toContain("secret");
  });
});
