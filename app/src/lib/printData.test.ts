import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import { assignGenerationsStable, groupByGeneration, buildPalmTreeLayout, formatPalmCouple, computePrintStats, assignGenerationsFromPrintRoot } from "@/lib/printData";
import { buildPrintSubgraph, DEFAULT_PRINT_SCOPE } from "@/lib/printFilter";

function person(
  id: number,
  givenName: string,
  fatherName?: string | null,
  gender: "male" | "female" = "male",
): Person {
  return {
    id,
    treeId: 1,
    givenName,
    fatherName: fatherName ?? null,
    kunya: null,
    laqab: null,
    clan: null,
    gender,
    birthDay: null,
    birthMonth: null,
    birthYear: null,
    birthPlace: null,
    deathDay: null,
    deathMonth: null,
    deathYear: null,
    deathPlace: null,
    isLiving: true,
    privacy: "family",
    photoUrl: null,
    notes: null,
    branchId: null,
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function parentRel(from: number, to: number): Relationship {
  return {
    id: from * 1000 + to,
    treeId: 1,
    fromPersonId: from,
    toPersonId: to,
    type: "parent",
    createdAt: new Date(),
  } as Relationship;
}

function spouseRel(a: number, b: number): Relationship {
  return {
    id: a * 1000 + b + 500,
    treeId: 1,
    fromPersonId: a,
    toPersonId: b,
    type: "spouse",
    createdAt: new Date(),
  } as Relationship;
}

describe("assignGenerationsStable", () => {
  it("puts father, grandfather, and uncle in the same generation ladder", () => {
    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "عم"),
      person(4, "ابن"),
    ];
    const rels = [
      parentRel(1, 2),
      parentRel(1, 3),
      parentRel(2, 4),
    ];
    const levels = assignGenerationsStable(people, rels);

    expect(levels.get(1)).toBe(0);
    expect(levels.get(2)).toBe(1);
    expect(levels.get(3)).toBe(1);
    expect(levels.get(4)).toBe(2);
  });

  it("aligns spouses to the same generation", () => {
    const people = [
      person(1, "زوج"),
      person(2, "زوجة", null, "female"),
      person(3, "ابن"),
    ];
    const rels = [spouseRel(1, 2), parentRel(1, 3)];
    const levels = assignGenerationsStable(people, rels);

    expect(levels.get(1)).toBe(0);
    expect(levels.get(2)).toBe(0);
    expect(levels.get(3)).toBe(1);
  });
});

describe("buildPrintSubgraph", () => {
  it("limits descendants by generationsDown and re-roots at generation 0", () => {
    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "ابن"),
      person(4, "حفيد"),
    ];
    const rels = [parentRel(1, 2), parentRel(2, 3), parentRel(3, 4)];

    const fromRoot = buildPrintSubgraph(people, rels, [], {
      ...DEFAULT_PRINT_SCOPE,
      rootPersonId: 2,
      generationsDown: 2,
    });

    expect(fromRoot.rootPersonId).toBe(2);
    expect(fromRoot.levels.get(2)).toBe(0);
    expect(fromRoot.levels.get(3)).toBe(1);
    expect(fromRoot.people.some((p) => p.id === 4)).toBe(false);
    expect(fromRoot.people.some((p) => p.id === 1)).toBe(false);

    const withParents = buildPrintSubgraph(people, rels, [], {
      ...DEFAULT_PRINT_SCOPE,
      rootPersonId: 3,
      generationsDown: 2,
      includeParents: true,
    });
    expect(withParents.levels.get(3)).toBe(0);
    expect(withParents.levels.get(2)).toBe(-1);
    expect(withParents.people.some((p) => p.id === 1)).toBe(false);
  });

  it("excludes spouses when includeSpouses is false", () => {
    const people = [
      person(1, "زوج"),
      person(2, "زوجة", null, "female"),
    ];
    const rels = [spouseRel(1, 2)];

    const withSpouse = buildPrintSubgraph(people, rels, [], {
      ...DEFAULT_PRINT_SCOPE,
      rootPersonId: 1,
      generationsDown: 1,
      includeSpouses: true,
    });
    expect(withSpouse.people.some((p) => p.id === 2)).toBe(true);

    const noSpouse = buildPrintSubgraph(people, rels, [], {
      ...DEFAULT_PRINT_SCOPE,
      rootPersonId: 1,
      generationsDown: 1,
      includeSpouses: false,
    });
    expect(noSpouse.people.some((p) => p.id === 2)).toBe(false);
  });

  it("places wives in the same generation as their husbands in print scope", () => {
    const people = [
      person(1, "حمود"),
      person(2, "حمدان"),
      person(3, "مريم", null, "female"),
      person(4, "سالم"),
    ];
    const rels = [
      parentRel(1, 2),
      spouseRel(2, 3),
      parentRel(2, 4),
      parentRel(3, 4),
    ];

    const subgraph = buildPrintSubgraph(people, rels, [], {
      ...DEFAULT_PRINT_SCOPE,
      rootPersonId: 1,
      generationsDown: 3,
      includeSpouses: true,
    });

    expect(subgraph.levels.get(2)).toBe(1);
    expect(subgraph.levels.get(3)).toBe(1);
    expect(subgraph.levels.get(4)).toBe(2);

    const genGroups = groupByGeneration(subgraph.people, subgraph.levels);
    const gen1 = genGroups.find((g) => g.level === 1)!;
    expect(gen1.people.some((p) => p.id === 2)).toBe(true);
    expect(gen1.people.some((p) => p.id === 3)).toBe(true);
  });
});

describe("assignGenerationsFromPrintRoot", () => {
  it("aligns wife to husband even without parent link in scope", () => {
    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "زوجة", null, "female"),
    ];
    const rels = [parentRel(1, 2), spouseRel(2, 3)];
    const levels = assignGenerationsFromPrintRoot(1, people, rels);
    expect(levels.get(2)).toBe(1);
    expect(levels.get(3)).toBe(1);
  });

  it("aligns mother via co-parent when spouse link is missing", () => {
    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "أم", null, "female"),
      person(4, "ابن"),
    ];
    const rels = [parentRel(1, 2), parentRel(2, 4), parentRel(3, 4)];
    const levels = assignGenerationsFromPrintRoot(1, people, rels);
    expect(levels.get(2)).toBe(1);
    expect(levels.get(3)).toBe(1);
    expect(levels.get(4)).toBe(2);
  });

  it("polygamy: wives share husband generation even as mothers only", () => {
    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "زوج"),
      person(4, "زوجة١", null, "female"),
      person(5, "زوجة٢", null, "female"),
      person(6, "ابن"),
    ];
    const rels = [
      parentRel(1, 2),
      parentRel(2, 3),
      parentRel(3, 6),
      parentRel(4, 6),
      spouseRel(3, 4),
      spouseRel(3, 5),
    ];
    const levels = assignGenerationsFromPrintRoot(1, people, rels);
    expect(levels.get(3)).toBe(2);
    expect(levels.get(4)).toBe(2);
    expect(levels.get(5)).toBe(2);
    expect(levels.get(6)).toBe(3);
  });
});

describe("groupByGeneration", () => {
  it("groups by actual level values", () => {
    const people = [person(1, "جد"), person(2, "أب"), person(3, "ابن")];
    const levels = new Map([
      [1, -2],
      [2, -1],
      [3, 0],
    ]);
    const groups = groupByGeneration(people, levels);
    expect(groups).toHaveLength(3);
    expect(groups[0]!.level).toBe(-2);
    expect(groups[0]!.people.map((p) => p.id)).toEqual([1]);
    expect(groups[2]!.people.map((p) => p.id)).toEqual([3]);
  });
});

describe("computePrintStats", () => {
  it("counts gender, living status, and per-generation breakdown", () => {
    const people = [
      { ...person(1, "جد"), isLiving: false, deathYear: 1990 },
      person(2, "أب"),
      person(3, "أم", null, "female"),
      person(4, "ابن"),
      { ...person(5, "ابنة", null, "female"), isLiving: false },
    ];
    const rels = [parentRel(1, 2), spouseRel(2, 3), parentRel(2, 4), parentRel(3, 4), parentRel(2, 5)];
    const levels = assignGenerationsStable(people, rels);
    const stats = computePrintStats(people, levels);

    expect(stats.total).toBe(5);
    expect(stats.males).toBe(3);
    expect(stats.females).toBe(2);
    expect(stats.living).toBe(3);
    expect(stats.deceased).toBe(2);
    expect(stats.generationCount).toBe(3);
    expect(stats.byGeneration.length).toBe(3);
    expect(stats.byGeneration[1]!.males).toBe(1);
    expect(stats.byGeneration[1]!.females).toBe(1);
  });
});

describe("buildPalmTreeLayout", () => {
  it("maps founder to trunk, couples to fronds, and children to leaflets", () => {
    const people = [
      person(1, "حمود"),
      person(2, "حمدان"),
      person(3, "مريم", null, "female"),
      person(4, "سالم"),
      person(5, "خلفان"),
    ];
    const rels = [
      parentRel(1, 2),
      spouseRel(2, 3),
      parentRel(2, 4),
      parentRel(3, 4),
      parentRel(2, 5),
      parentRel(3, 5),
    ];
    const levels = assignGenerationsStable(people, rels);
    const palm = buildPalmTreeLayout(people, rels, levels, 1);

    expect(palm.founder?.id).toBe(1);
    expect(palm.fronds).toHaveLength(1);
    expect(palm.fronds[0]!.father?.id).toBe(2);
    expect(palm.fronds[0]!.mother?.id).toBe(3);
    expect(palm.fronds[0]!.children.map((c) => c.id).sort()).toEqual([4, 5]);
    expect(formatPalmCouple(palm.fronds[0]!.father, palm.fronds[0]!.mother)).toContain("حمدان");
  });
});

describe("computeSunLayout", () => {
  it("places root at center and children on first ring", async () => {
    const { computeSunLayout } = await import("@/lib/printData");
    const people = [
      person(1, "حمدان"),
      person(2, "شيخة", null, "female"),
      person(3, "حمود"),
      person(4, "ماجد"),
      person(5, "عمر"),
    ];
    const rels = [
      spouseRel(1, 2),
      parentRel(1, 3),
      parentRel(2, 3),
      parentRel(3, 4),
      parentRel(3, 5),
    ];
    const levels = assignGenerationsStable(people, rels);
    const { positions, edges, ringCount } = computeSunLayout(people, rels, levels, 1);

    expect(positions.get(1)?.ring).toBe(0);
    expect(positions.get(2)?.ring).toBe(0);
    expect(positions.get(3)?.ring).toBe(1);
    expect(positions.get(4)?.ring).toBe(2);
    expect(ringCount).toBeGreaterThanOrEqual(3);
    expect(edges.some((e) => e.fromId === 1 && e.toId === 3)).toBe(true);
    // الأحفاد في قطاع والدهم تقريباً
    const hamoud = positions.get(3)!;
    const majed = positions.get(4)!;
    const omar = positions.get(5)!;
    expect(Math.abs(majed.angle - hamoud.angle)).toBeLessThan(90);
    expect(Math.abs(omar.angle - hamoud.angle)).toBeLessThan(90);
  });
});
