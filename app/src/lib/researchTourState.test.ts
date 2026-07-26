import { describe, expect, it } from "vitest";
import {
  getResearchTourState,
  setResearchTourState,
} from "@/lib/researchTourState";
import { buildResearchTourItems } from "@/lib/researchTour";
import type { Person } from "@db/tables";
import type { PersonGap } from "@/lib/personGaps";

describe("researchTourState", () => {
  it("persists scope and index", () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
      configurable: true,
    });
    const treeId = 900002;
    setResearchTourState(treeId, { scope: "favorites", index: 3 });
    expect(getResearchTourState(treeId)).toEqual({
      scope: "favorites",
      index: 3,
    });
  });
});

describe("buildResearchTourItems allowedPersonIds", () => {
  it("filters by allowed set", () => {
    const person = (id: number, name: string): Person =>
      ({
        id,
        treeId: 1,
        givenName: name,
        gender: "male",
        birthYear: null,
        isLiving: true,
      }) as Person;
    const a = person(1, "أ");
    const b = person(2, "ب");
    const byId = new Map([
      [1, a],
      [2, b],
    ]);
    const gaps = new Map<number, PersonGap[]>([
      [1, [{ kind: "noBirthYear" }]],
      [2, [{ kind: "noBirthYear" }]],
    ]);
    const all = buildResearchTourItems(gaps, byId, []);
    expect(all).toHaveLength(2);
    const scoped = buildResearchTourItems(gaps, byId, [], {
      allowedPersonIds: new Set([1]),
    });
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.personId).toBe(1);
  });
});
