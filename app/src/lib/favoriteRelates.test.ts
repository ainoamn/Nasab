import { beforeEach, describe, expect, it } from "vitest";
import {
  getFavoriteRelates,
  isFavoriteRelate,
  toggleFavoriteRelate,
} from "@/lib/favoriteRelates";

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

describe("favoriteRelates", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("normalizes pair order and toggles", () => {
    expect(getFavoriteRelates(1)).toEqual([]);
    expect(toggleFavoriteRelate(1, 5, 2)).toEqual([{ a: 2, b: 5 }]);
    expect(isFavoriteRelate(1, 5, 2)).toBe(true);
    expect(isFavoriteRelate(1, 2, 5)).toBe(true);
    expect(toggleFavoriteRelate(1, 2, 5)).toEqual([]);
  });

  it("ignores same-id and caps at 12", () => {
    expect(toggleFavoriteRelate(1, 3, 3)).toEqual([]);
    for (let i = 1; i <= 15; i++) toggleFavoriteRelate(1, i, i + 100);
    const pairs = getFavoriteRelates(1);
    expect(pairs).toHaveLength(12);
    expect(pairs[0]).toEqual({ a: 15, b: 115 });
  });

  it("returns empty on bad JSON", () => {
    localStorage.setItem("nasab:favoriteRelates:3", "{bad");
    expect(getFavoriteRelates(3)).toEqual([]);
  });
});
