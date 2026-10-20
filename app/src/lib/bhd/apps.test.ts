import { describe, expect, it } from "vitest";
import {
  BHD_APPS,
  BHD_APP_SWITCHER_SPEC,
  hopOrigins,
  launchUrlForApp,
  startUrlForApp,
  workspaceUrlForApp,
} from "./apps";

describe("BHD app catalog", () => {
  it("opens Nasab workspace directly; startUrl is for first login only", () => {
    expect(BHD_APP_SWITCHER_SPEC).toBe("bhd-appswitcher.v1");
    const nasab = BHD_APPS.find((app) => app.id === "nasab");
    expect(nasab?.clientId).toBe("bhd-nasab");
    expect(nasab?.origin).toBe("https://nasab.bhd-om.com");
    expect(nasab?.workspacePath).toBe("/app");
    expect(workspaceUrlForApp(nasab!)).toBe("https://nasab.bhd-om.com/app");
    expect(launchUrlForApp(nasab!)).toBe("https://nasab.bhd-om.com/app");
    expect(startUrlForApp(nasab!)).toBe(
      "https://nasab.bhd-om.com/api/auth/bhd/start?returnTo=%2Fapp",
    );
    expect(nasab?.mode).toBe("sso");
    expect(hopOrigins()).toContain("https://nasab.bhd-om.com");
  });
});
