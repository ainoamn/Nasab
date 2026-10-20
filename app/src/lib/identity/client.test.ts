import { describe, expect, it } from "vitest";
import { addAccountUrl, productStartPath } from "./client";

describe("identity client helpers", () => {
  it("builds product start path for isolation reload", () => {
    expect(productStartPath("/dashboard")).toBe(
      "/api/auth/bhd/start?returnTo=%2Fdashboard",
    );
    expect(productStartPath("/trees/1?x=1")).toBe(
      "/api/auth/bhd/start?returnTo=%2Ftrees%2F1%3Fx%3D1",
    );
  });

  it("add-account URL uses add=1 only", () => {
    const href = addAccountUrl();
    expect(href.startsWith("https://id.bhd-om.com/login?add=1")).toBe(true);
    expect(href).toContain("next=");
    expect(href).toContain("auth%2Fcontinue");
  });
});
