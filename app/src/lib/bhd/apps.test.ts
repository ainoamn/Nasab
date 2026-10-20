import { describe, expect, it } from "vitest";
import { BHD_APPS, BHD_APP_SWITCHER_SPEC, launchUrlForApp } from "./apps";

describe("BHD app catalog", () => {
  it("freezes the switcher spec and Nasab SSO workspace start URL", () => {
    expect(BHD_APP_SWITCHER_SPEC).toBe("bhd-appswitcher.v1");
    const nasab = BHD_APPS.find((app) => app.id === "nasab");
    expect(nasab?.clientId).toBe("bhd-nasab");
    expect(nasab?.origin).toBe("https://nasab.bhd-om.com");
    expect(nasab?.workspacePath).toBe("/app");
    expect(nasab?.startUrl).toBe(
      "https://nasab.bhd-om.com/api/auth/bhd/start?returnTo=%2Fapp",
    );
    expect(nasab?.mode).toBe("sso");
    expect(launchUrlForApp(nasab!)).toBe(nasab!.startUrl);
  });
});
