import { beforeEach, describe, expect, it } from "vitest";
import {
  getOccasionsScope,
  getShareOccasionsScope,
  setOccasionsScope,
  setShareOccasionsScope,
} from "@/lib/occasionsScope";

function mockLocalStorage() {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    },
    configurable: true,
  });
}

describe("occasionsScope", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("defaults to close and persists all scopes", () => {
    expect(getOccasionsScope(1)).toBe("close");
    expect(setOccasionsScope(1, "all")).toBe("all");
    expect(getOccasionsScope(1)).toBe("all");
    setOccasionsScope(1, "favorites");
    expect(getOccasionsScope(1)).toBe("favorites");
  });

  it("falls back on invalid stored values", () => {
    localStorage.setItem("nasab:occasionsScope:2", "weird");
    expect(getOccasionsScope(2)).toBe("close");
  });

  it("stores share-token scope separately", () => {
    expect(getShareOccasionsScope("tok")).toBe("close");
    setShareOccasionsScope("tok", "favorites");
    expect(getShareOccasionsScope("tok")).toBe("favorites");
    expect(getOccasionsScope(9)).toBe("close");
  });
});
