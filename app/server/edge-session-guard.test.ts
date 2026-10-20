import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const src = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "edge-session-guard.js"),
  "utf8",
);

describe("edge session guard source", () => {
  it("protects workspace paths and skips public ones", () => {
    expect(src).toContain("/(app|dashboard|account|checkout|admin|trees)");
    expect(src).toContain("/share/");
    expect(src).toContain("/invite/");
    expect(src).toContain("kimi_sid");
    expect(src).toContain("/api/auth/bhd/start");
    expect(src).toContain("307");
  });
});
