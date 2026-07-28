import { describe, expect, it } from "vitest";
import { buildResearchTourItems } from "@/lib/researchTour";
import type { Person } from "@db/tables";
import type { PersonGap } from "@/lib/personGaps";

function person(id: number, name: string): Person {
  return {
    id,
    treeId: 1,
    givenName: name,
    gender: "male",
    birthYear: null,
    isLiving: true,
  } as Person;
}

describe("buildResearchTourItems", () => {
  it("skips dismissed and ranks home then favorites", () => {
    const a = person(1, "أ");
    const b = person(2, "ب");
    const c = person(3, "ج");
    const byId = new Map([
      [1, a],
      [2, b],
      [3, c],
    ]);
    const gaps = new Map<number, PersonGap[]>([
      [1, [{ kind: "noBirthYear" }]],
      [2, [{ kind: "noPhoto" }]],
      [3, [{ kind: "missingMother" }]],
    ]);
    const items = buildResearchTourItems(gaps, byId, ["noPhoto:2:0"], {
      homeId: 3,
      favoriteIds: [1],
      recentIds: [2],
    });
    expect(items.map((i) => i.personId)).toEqual([3, 1]);
    expect(items.every((i) => i.kind !== "noPhoto")).toBe(true);
  });

  it("respects allowedPersonIds", () => {
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
    const scoped = buildResearchTourItems(gaps, byId, [], {
      allowedPersonIds: new Set([2]),
    });
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.personId).toBe(2);
  });
});
