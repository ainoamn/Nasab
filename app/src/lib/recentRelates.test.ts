import { beforeEach, describe, expect, it } from "vitest";
import { getRecentRelates, pushRecentRelate } from "@/lib/recentRelates";

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

describe("recentRelates", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("pushes newest-first and normalizes", () => {
    expect(pushRecentRelate(1, 4, 1)).toEqual([{ a: 1, b: 4 }]);
    expect(pushRecentRelate(1, 9, 2)).toEqual([
      { a: 2, b: 9 },
      { a: 1, b: 4 },
    ]);
    expect(pushRecentRelate(1, 1, 4)).toEqual([
      { a: 1, b: 4 },
      { a: 2, b: 9 },
    ]);
  });

  it("caps at 8 and ignores invalid", () => {
    expect(pushRecentRelate(1, 1, 1)).toEqual([]);
    for (let i = 1; i <= 10; i++) pushRecentRelate(1, i, i + 50);
    expect(getRecentRelates(1)).toHaveLength(8);
  });

  it("returns empty on bad JSON", () => {
    localStorage.setItem("nasab:recentRelates:2", '"x"');
    expect(getRecentRelates(2)).toEqual([]);
  });
});
