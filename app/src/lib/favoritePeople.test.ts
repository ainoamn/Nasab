import { beforeEach, describe, expect, it } from "vitest";
import {
  getFavoritePersonIds,
  isFavoritePerson,
  toggleFavoritePersonId,
} from "@/lib/favoritePeople";

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

describe("favoritePeople", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("starts empty and toggles", () => {
    expect(getFavoritePersonIds(1)).toEqual([]);
    expect(toggleFavoritePersonId(1, 5)).toEqual([5]);
    expect(isFavoritePerson(1, 5)).toBe(true);
    expect(toggleFavoritePersonId(1, 5)).toEqual([]);
    expect(isFavoritePerson(1, 5)).toBe(false);
  });

  it("dedupes and caps at 24 newest-first", () => {
    for (let i = 1; i <= 30; i++) toggleFavoritePersonId(1, i);
    const ids = getFavoritePersonIds(1);
    expect(ids).toHaveLength(24);
    expect(ids[0]).toBe(30);
    expect(ids).not.toContain(1);
  });

  it("returns empty on bad JSON", () => {
    localStorage.setItem("nasab:favorites:3", "{bad");
    expect(getFavoritePersonIds(3)).toEqual([]);
    localStorage.setItem("nasab:favorites:3", '"x"');
    expect(getFavoritePersonIds(3)).toEqual([]);
  });
});
