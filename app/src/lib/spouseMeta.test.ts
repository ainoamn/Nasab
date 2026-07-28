import { describe, expect, it } from "vitest";
import {
  findSpouseRel,
  formatSpouseDates,
  rtlColumnCenters,
  sortSpouses,
} from "@/lib/spouseMeta";
import type { Person, Relationship } from "@db/tables";

function person(id: number, name: string): Person {
  return { id, treeId: 1, givenName: name, gender: "female" } as Person;
}

function spouseRel(
  id: number,
  a: number,
  b: number,
  extras: Partial<Relationship> = {},
): Relationship {
  return {
    id,
    treeId: 1,
    type: "spouse",
    fromPersonId: a,
    toPersonId: b,
    createdAt: new Date(2020, 0, id),
    ...extras,
  } as Relationship;
}

describe("findSpouseRel", () => {
  it("matches either direction", () => {
    const rels = [spouseRel(1, 2, 5)];
    expect(findSpouseRel(rels, 2, 5)?.id).toBe(1);
    expect(findSpouseRel(rels, 5, 2)?.id).toBe(1);
    expect(findSpouseRel(rels, 2, 9)).toBeUndefined();
  });
});

describe("sortSpouses", () => {
  it("orders by marriage year then createdAt", () => {
    const a = person(10, "أ");
    const b = person(11, "ب");
    const c = person(12, "ج");
    const rels = [
      spouseRel(1, 1, 10, { marriageYear: 2010 }),
      spouseRel(2, 1, 11, { marriageYear: 2005 }),
      spouseRel(3, 1, 12, { marriageYear: null }),
    ];
    expect(sortSpouses([a, b, c], rels, 1).map((p) => p.id)).toEqual([
      11, 10, 12,
    ]);
  });
});

describe("rtlColumnCenters", () => {
  it("places first column on the right", () => {
    expect(rtlColumnCenters(1)).toEqual([50]);
    expect(rtlColumnCenters(2)[0]).toBeCloseTo(75);
    expect(rtlColumnCenters(2)[1]).toBeCloseTo(25);
  });
});

describe("formatSpouseDates", () => {
  it("formats marriage and divorce labels", () => {
    const t = (k: string, o?: Record<string, unknown>) =>
      `${k}:${o?.date ?? ""}`;
    expect(
      formatSpouseDates(
        {
          marriageYear: 2001,
          marriageMonth: 3,
          marriageDay: 5,
          divorceYear: 2010,
        },
        t,
      ),
    ).toEqual({
      marriage: expect.stringContaining("chart.marriedOn:"),
      divorce: expect.stringContaining("chart.divorcedOn:"),
    });
    expect(formatSpouseDates(null, t)).toEqual({});
  });
});
