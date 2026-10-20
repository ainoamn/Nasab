import { describe, expect, it } from "vitest";
import {
  accountHandle,
  identityAddAccountHref,
  identityEndSessionHref,
  NASAB_WORKSPACE_PATH,
  nasabSilentStartHref,
} from "./accounts";

describe("identity multi-account helpers", () => {
  it("builds add-account and silent-start URLs", () => {
    const add = identityAddAccountHref();
    expect(add.startsWith("https://id.bhd-om.com/login?add=1")).toBe(true);
    expect(add).toContain("next=");
    expect(NASAB_WORKSPACE_PATH).toBe("/app");
    expect(nasabSilentStartHref()).toBe("/api/auth/bhd/start?returnTo=%2Fapp");
    expect(nasabSilentStartHref("/dashboard")).toBe(
      "/api/auth/bhd/start?returnTo=%2Fdashboard",
    );
  });

  it("adds all=1 on end-session for logout of every account", () => {
    const url = identityEndSessionHref({
      clientId: "bhd-nasab",
      postLogoutRedirectUri: "https://nasab.bhd-om.com/",
      all: true,
    });
    expect(url).toContain("https://id.bhd-om.com/oauth/end-session");
    expect(url).toContain("client_id=bhd-nasab");
    expect(url).toContain("all=1");
  });

  it("prefers email, then username, then phone over name", () => {
    expect(
      accountHandle({
        email: "a@bhd.om",
        username: "ali",
        phone: "96890000000",
        name: "علي",
      }),
    ).toBe("a@bhd.om");
    expect(accountHandle({ email: "", username: "ali", phone: "1", name: "علي" })).toBe(
      "ali",
    );
    expect(accountHandle({ email: "", username: "", phone: "9689", name: "علي" })).toBe(
      "9689",
    );
    expect(accountHandle({ name: "علي" })).toBe("علي");
  });
});
