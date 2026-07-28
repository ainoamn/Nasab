import { beforeEach, describe, expect, it } from "vitest";
import { getRecentPersonIds, pushRecentPersonId } from "@/lib/recentPeople";

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

describe("recentPeople", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("starts empty and pushes newest first", () => {
    expect(getRecentPersonIds(1)).toEqual([]);
    pushRecentPersonId(1, 5);
    pushRecentPersonId(1, 9);
    expect(getRecentPersonIds(1)).toEqual([9, 5]);
  });

  it("dedupes and caps at 12", () => {
    pushRecentPersonId(1, 5);
    pushRecentPersonId(1, 5);
    expect(getRecentPersonIds(1)).toEqual([5]);
    for (let i = 1; i <= 15; i++) pushRecentPersonId(1, i);
    const ids = getRecentPersonIds(1);
    expect(ids).toHaveLength(12);
    expect(ids[0]).toBe(15);
    expect(ids).not.toContain(1);
  });

  it("returns empty on bad JSON", () => {
    localStorage.setItem("nasab:recentPeople:2", "{bad");
    expect(getRecentPersonIds(2)).toEqual([]);
  });
});
