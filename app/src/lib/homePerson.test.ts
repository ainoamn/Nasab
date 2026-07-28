import { beforeEach, describe, expect, it } from "vitest";
import { getHomePersonId, setHomePersonId } from "@/lib/homePerson";

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
  return store;
}

describe("homePerson", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("returns null when unset", () => {
    expect(getHomePersonId(1)).toBeNull();
  });

  it("stores and clears home person id", () => {
    setHomePersonId(1, 42);
    expect(getHomePersonId(1)).toBe(42);
    setHomePersonId(1, null);
    expect(getHomePersonId(1)).toBeNull();
  });

  it("ignores invalid stored values", () => {
    localStorage.setItem("nasab:homePerson:2", "0");
    expect(getHomePersonId(2)).toBeNull();
    localStorage.setItem("nasab:homePerson:2", "nope");
    expect(getHomePersonId(2)).toBeNull();
  });
});
