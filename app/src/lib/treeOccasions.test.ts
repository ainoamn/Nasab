import { describe, expect, it } from "vitest";
import {
  buildTreeOccasions,
  daysUntilMd,
  groupOccasionsByMonth,
} from "@/lib/treeOccasions";
import type { Person, Relationship } from "@db/tables";

function person(
  id: number,
  name: string,
  extras: Partial<Person> = {},
): Person {
  return {
    id,
    treeId: 1,
    givenName: name,
    gender: "male",
    isLiving: true,
    ...extras,
  } as Person;
}

describe("daysUntilMd", () => {
  it("returns 0 for today", () => {
    const from = new Date(2026, 6, 28);
    expect(daysUntilMd(7, 28, from)).toBe(0);
  });

  it("wraps to next year when date passed", () => {
    const from = new Date(2026, 6, 28);
    const days = daysUntilMd(1, 1, from);
    expect(days).toBeGreaterThan(0);
    expect(days).toBeLessThanOrEqual(366);
  });
});

describe("buildTreeOccasions", () => {
  it("builds birthday memorial and anniversary sorted by daysUntil", () => {
    const a = person(1, "أحمد", {
      birthMonth: 7,
      birthDay: 28,
      deathMonth: 12,
      deathDay: 1,
      isLiving: false,
    });
    const b = person(2, "سعود", { birthMonth: 8, birthDay: 1 });
    const rels = [
      {
        id: 9,
        treeId: 1,
        type: "spouse",
        fromPersonId: 1,
        toPersonId: 2,
        marriageMonth: 7,
        marriageDay: 29,
      } as Relationship,
    ];
    const from = new Date(2026, 6, 28);
    const list = buildTreeOccasions([a, b], rels).map((e) => ({
      ...e,
      daysUntil: daysUntilMd(e.month, e.day, from),
    }));
    const kinds = buildTreeOccasions([a, b], rels).map((e) => e.kind);
    expect(kinds).toContain("birthday");
    expect(kinds).toContain("memorial");
    expect(kinds).toContain("anniversary");
    expect(buildTreeOccasions([a, b], rels, { limit: 2 })).toHaveLength(2);
    expect(list[0]?.daysUntil).toBeLessThanOrEqual(list.at(-1)?.daysUntil ?? 0);
  });
});

describe("groupOccasionsByMonth", () => {
  it("groups ascending by month", () => {
    const a = person(1, "أ", { birthMonth: 3, birthDay: 1 });
    const b = person(2, "ب", { birthMonth: 1, birthDay: 2 });
    const groups = groupOccasionsByMonth(buildTreeOccasions([a, b], []));
    expect(groups.map((g) => g.month)).toEqual([1, 3]);
  });
});
