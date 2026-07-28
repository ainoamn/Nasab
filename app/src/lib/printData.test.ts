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
    twinGroupId: null,
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

  it("includes children linked only to the mother when spouses are enabled", () => {
    const people = [
      person(1, "خلفان"),
      person(2, "شيخة", null, "female"),
      person(3, "سعيد"),
      person(4, "فاطمة", null, "female"),
      person(5, "راشد"), // ابن فاطمة فقط دون رابط بالأب
      person(6, "ماجد"), // فرع آخر من خلفان
    ];
    const rels = [
      spouseRel(1, 2),
      parentRel(1, 3),
      parentRel(2, 3),
      spouseRel(3, 4),
      parentRel(4, 5), // الأم فقط
      parentRel(1, 6),
      parentRel(2, 6),
    ];

    const subgraph = buildPrintSubgraph(people, rels, [], {
      ...DEFAULT_PRINT_SCOPE,
      rootPersonId: 1,
      generationsDown: 4,
      includeSpouses: true,
      includeSpouseLineage: false,
    });

    expect(subgraph.people.map((p) => p.id).sort()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(subgraph.levels.get(5)).toBe(2);
    expect(subgraph.levels.get(6)).toBe(1);
  });

  it("limits by BFS depth from chosen root not whole-tree generation", () => {
    // جد أعلى ثم سلسلة طويلة — الجذر في الوسط
    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "خلفان"),
      person(4, "ابن"),
      person(5, "حفيد"),
      person(6, "حفيد2"),
      person(7, "حفيد3"),
    ];
    const rels = [
      parentRel(1, 2),
      parentRel(2, 3),
      parentRel(3, 4),
      parentRel(4, 5),
      parentRel(5, 6),
      parentRel(6, 7),
    ];

    const subgraph = buildPrintSubgraph(people, rels, [], {
      ...DEFAULT_PRINT_SCOPE,
      rootPersonId: 3,
      generationsDown: 3,
      includeParents: false,
      includeSpouses: false,
    });

    expect(subgraph.people.some((p) => p.id === 1)).toBe(false);
    expect(subgraph.people.some((p) => p.id === 2)).toBe(false);
    expect(subgraph.people.some((p) => p.id === 3)).toBe(true);
    expect(subgraph.people.some((p) => p.id === 4)).toBe(true);
    expect(subgraph.people.some((p) => p.id === 5)).toBe(true);
    // الجيل الثالث من الجذر (عمق 2) آخر مشمول عند generationsDown=3
    expect(subgraph.people.some((p) => p.id === 6)).toBe(false);
    expect(subgraph.people.some((p) => p.id === 7)).toBe(false);
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

describe("formatPrintChartName", () => {
  it("returns full nasab when mode is full", async () => {
    const { formatPrintChartName } = await import("@/lib/printData");
    const p = { ...person(1, "حمود"), fatherName: "بن حمدان بن خلفان", laqab: "الرواحي" };
    expect(formatPrintChartName(p, "full")).toContain("حمود");
    expect(formatPrintChartName(p, "full")).toContain("بن حمدان");
    expect(formatPrintChartName(p, "full")).toContain("الرواحي");
  });

  it("returns first given name only when mode is firstOnly", async () => {
    const { formatPrintChartName } = await import("@/lib/printData");
    const p = { ...person(1, "أحمد بن حمود"), fatherName: "بن حمدان" };
    expect(formatPrintChartName(p, "firstOnly")).toBe("أحمد");
  });
});

describe("applyNameMode", () => {
  it("strips lineage fields and keeps first given token", async () => {
    const { applyNameMode } = await import("@/lib/printFilter");
    const people = [
      { ...person(1, "أحمد بن سعيد"), fatherName: "بن حمود بن حمدان", laqab: "الرواحي" },
    ];
    const out = applyNameMode(people, "firstOnly");
    expect(out[0]!.givenName).toBe("أحمد");
    expect(out[0]!.fatherName).toBeNull();
    expect(out[0]!.laqab).toBeNull();
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
    expect(stats.inLawSpouses).toBe(0);
    expect(stats.twins).toBe(0);
    expect(stats.byGeneration.length).toBe(3);
    expect(stats.byGeneration[1]!.males).toBe(1);
    expect(stats.byGeneration[1]!.females).toBe(1);

    const withRoot = computePrintStats(people, levels, rels, { rootPersonId: 1 });
    expect(withRoot.inLawSpouses).toBe(1); // الأم زوجة من خارج النسب إن لم تكن بنتاً للجذع
  });

  it("counts twins and in-law spouses from the bloodline root", () => {
    const people = [
      person(1, "جذع"),
      person(2, "زوجة", null, "female"),
      { ...person(3, "توأم1"), twinGroupId: 100 },
      { ...person(4, "توأم2"), twinGroupId: 100 },
      person(5, "عادي"),
    ];
    const rels = [
      spouseRel(1, 2),
      parentRel(1, 3),
      parentRel(2, 3),
      parentRel(1, 4),
      parentRel(2, 4),
      parentRel(1, 5),
      parentRel(2, 5),
    ];
    const levels = assignGenerationsStable(people, rels);
    const stats = computePrintStats(people, levels, rels, { rootPersonId: 1 });
    expect(stats.twins).toBe(2);
    expect(stats.inLawSpouses).toBe(1);
    expect(stats.generationCount).toBe(2);
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
    expect(
      formatPalmCouple(palm.fronds[0]!.father, palm.fronds[0]!.mother, people),
    ).toContain("حمدان");
  });

  it("marks twins in palm couple labels", () => {
    const people = [
      person(1, "أب"),
      person(2, "أم", null, "female"),
    ];
    people[0]!.twinGroupId = 9;
    people[0]!.birthYear = 1980;
    // second twin not needed for mark on father alone if group size < 2
    const twinBro = person(3, "عم");
    twinBro.twinGroupId = 9;
    twinBro.birthYear = 1980;
    people.push(twinBro);
    const label = formatPalmCouple(people[0]!, people[1]!, people);
    expect(label).toMatch(/ت/);
  });

  it("orders twin leaflets by stable birth then id", () => {
    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "أم", null, "female"),
      person(10, "توأمب"),
      person(4, "توأمأ"),
    ];
    people[3]!.birthYear = 2000;
    people[3]!.birthMonth = 1;
    people[3]!.birthDay = 1;
    people[3]!.twinGroupId = 77;
    people[4]!.birthYear = 2000;
    people[4]!.birthMonth = 1;
    people[4]!.birthDay = 1;
    people[4]!.twinGroupId = 77;
    const rels = [
      parentRel(1, 2),
      spouseRel(2, 3),
      parentRel(2, 4),
      parentRel(3, 4),
      parentRel(2, 10),
      parentRel(3, 10),
    ];
    const levels = assignGenerationsStable(people, rels);
    const palm = buildPalmTreeLayout(people, rels, levels, 1);
    expect(palm.fronds[0]!.children.map((c) => c.id)).toEqual([4, 10]);
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
    const { positions, edges, spouseEdges, ringCount, rootIds } = computeSunLayout(
      people,
      rels,
      levels,
      1,
    );

    expect(rootIds).toEqual([1]);
    expect(positions.get(1)?.ring).toBe(0);
    expect(positions.get(1)?.isSpouse).toBeFalsy();
    expect(positions.get(2)?.isSpouse).toBe(true);
    expect(positions.get(2)?.ring).toBe(0);
    // زوجة الجذر أسفل المركز وليست فوقه
    expect(positions.get(2)!.y).toBeGreaterThan(positions.get(1)!.y);
    expect(Math.hypot(positions.get(2)!.x - 50, positions.get(2)!.y - 50)).toBeGreaterThan(8);
    expect(positions.get(3)?.ring).toBe(1);
    expect(positions.get(3)?.isSpouse).toBeFalsy();
    expect(positions.get(4)?.ring).toBe(2);
    expect(ringCount).toBeGreaterThanOrEqual(3);
    expect(edges.some((e) => e.fromId === 1 && e.toId === 3)).toBe(true);
    expect(spouseEdges.some((e) => e.fromId === 1 && e.toId === 2)).toBe(true);
    // خط النسب لا يخرج من الزوجة
    expect(edges.every((e) => e.fromId !== 2)).toBe(true);
    const hamoud = positions.get(3)!;
    const majed = positions.get(4)!;
    const omar = positions.get(5)!;
    expect(Math.abs(majed.angle - hamoud.angle)).toBeLessThan(90);
    expect(Math.abs(omar.angle - hamoud.angle)).toBeLessThan(90);
  });

  it("keeps primary nodes on a dense ring from stacking on the same angle", async () => {
    const { computeSunLayout } = await import("@/lib/printData");
    const people = [
      person(1, "جذع"),
      ...Array.from({ length: 12 }, (_, i) => person(10 + i, `ابن${i + 1}`)),
    ];
    const rels = people.slice(1).map((p) => parentRel(1, p.id));
    const levels = assignGenerationsStable(people, rels);
    const { positions } = computeSunLayout(people, rels, levels, 1);

    const ring1 = [...positions.entries()]
      .filter(([, p]) => p.ring === 1 && !p.isSpouse)
      .map(([, p]) => ((p.angle % 360) + 360) % 360)
      .sort((a, b) => a - b);

    expect(ring1).toHaveLength(12);
    for (let i = 0; i < ring1.length; i++) {
      const next = ring1[(i + 1) % ring1.length]!;
      let delta = next - ring1[i]!;
      if (i === ring1.length - 1) delta += 360;
      expect(delta).toBeGreaterThan(20);
    }
  });

  it("attaches in-law spouses as satellites off the bloodline ring", async () => {
    const { computeSunLayout } = await import("@/lib/printData");
    const people = [
      person(1, "خلفان"),
      person(2, "شيخة", null, "female"),
      person(3, "إبراهيم"),
      person(4, "جليلة", null, "female"),
    ];
    const rels = [
      spouseRel(1, 2),
      parentRel(1, 3),
      parentRel(2, 3),
      spouseRel(3, 4),
    ];
    const levels = assignGenerationsStable(people, rels);
    const { positions, edges, spouseEdges } = computeSunLayout(people, rels, levels, 1);

    expect(positions.get(3)?.isSpouse).toBeFalsy();
    expect(positions.get(4)?.isSpouse).toBe(true);
    expect(positions.get(4)?.radiusBias ?? 0).toBeLessThan(0);
    expect(spouseEdges.some((e) => e.fromId === 3 && e.toId === 4)).toBe(true);
    expect(edges.every((e) => e.fromId === 1 || e.fromId === 3)).toBe(true);

    const blood = positions.get(3)!;
    const spouse = positions.get(4)!;
    const bloodR = Math.hypot(blood.x - 50, blood.y - 50);
    const spouseR = Math.hypot(spouse.x - 50, spouse.y - 50);
    expect(spouseR).toBeLessThan(bloodR);
  });

  it("places each of multiple wives as a separate icon", async () => {
    const { computeSunLayout } = await import("@/lib/printData");
    const people = [
      person(1, "حمدان"),
      person(2, "أسماء", null, "female"),
      person(3, "شيخة", null, "female"),
      person(4, "فاطمة", null, "female"),
      person(5, "سعيد"),
      person(6, "راشد"),
      person(7, "ماجد"),
    ];
    const rels = [
      spouseRel(1, 2),
      spouseRel(1, 3),
      spouseRel(1, 4),
      parentRel(1, 5),
      parentRel(2, 5),
      parentRel(1, 6),
      parentRel(3, 6),
      parentRel(1, 7),
      parentRel(4, 7),
    ];
    const levels = assignGenerationsStable(people, rels);
    const { positions, spouseEdges } = computeSunLayout(people, rels, levels, 1);

    const wifeIds = [2, 3, 4];
    for (const wid of wifeIds) {
      expect(positions.get(wid)?.isSpouse).toBe(true);
    }
    expect(spouseEdges.filter((e) => e.fromId === 1).length).toBeGreaterThanOrEqual(3);

    const pts = wifeIds.map((id) => positions.get(id)!);
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dist = Math.hypot(pts[i]!.x - pts[j]!.x, pts[i]!.y - pts[j]!.y);
        expect(dist).toBeGreaterThan(4);
      }
    }
  });

  it("links cousin spouses across branches and keeps children under the father", async () => {
    const { computeSunLayout } = await import("@/lib/printData");
    // جذر → حمود وخميس → أسعد (ابن حمود) وآسية (بنت خميس) متزوجان ولهما بلقيس
    const people = [
      person(1, "حمدان"),
      person(2, "حمود"),
      person(3, "خميس"),
      person(4, "أسعد"),
      person(5, "آسية", null, "female"),
      person(6, "بلقيس", null, "female"),
    ];
    const rels = [
      parentRel(1, 2),
      parentRel(1, 3),
      parentRel(2, 4),
      parentRel(3, 5),
      spouseRel(4, 5),
      parentRel(4, 6),
      parentRel(5, 6),
    ];
    const levels = assignGenerationsStable(people, rels);
    const { positions, edges, spouseEdges } = computeSunLayout(people, rels, levels, 1);

    expect(positions.get(5)?.isSpouse).toBeFalsy(); // آسية في فرع خميس
    expect(positions.get(4)?.crossBranchSpouse).toBe(true);
    expect(positions.get(5)?.crossBranchSpouse).toBe(true);
    expect(
      spouseEdges.some(
        (e) =>
          (e.fromId === 4 && e.toId === 5) || (e.fromId === 5 && e.toId === 4),
      ),
    ).toBe(true);
    // الأبناء عند الأب لأنه موجود في الشجرة
    expect(edges.some((e) => e.fromId === 4 && e.toId === 6)).toBe(true);
    expect(edges.some((e) => e.fromId === 5 && e.toId === 6)).toBe(false);
  });

  it("places children under the mother when the father is outside the chart", async () => {
    const { computeSunLayout } = await import("@/lib/printData");
    const people = [
      person(1, "جذع"),
      person(2, "آسية", null, "female"),
      person(3, "بلقيس", null, "female"),
      // الأب أسعد غير موجود في الشجرة المطبوعة
    ];
    const rels = [
      parentRel(1, 2),
      parentRel(2, 3),
      // أب خارج النطاق — لا نضيفه لـ people
    ];
    const levels = assignGenerationsStable(people, rels);
    const { edges } = computeSunLayout(people, rels, levels, 1);
    expect(edges.some((e) => e.fromId === 2 && e.toId === 3)).toBe(true);
  });

  it("spreads a busy ring around the full circle (sun shape)", async () => {
    const { computeSunLayout } = await import("@/lib/printData");
    const people = [
      person(1, "جذع"),
      ...Array.from({ length: 8 }, (_, i) => person(10 + i, `ابن${i}`)),
    ];
    const rels = Array.from({ length: 8 }, (_, i) => parentRel(1, 10 + i));
    const levels = assignGenerationsStable(people, rels);
    const { positions } = computeSunLayout(people, rels, levels, 1);
    const angles = [10, 11, 12, 13, 14, 15, 16, 17]
      .map((id) => ((positions.get(id)!.angle % 360) + 360) % 360)
      .sort((a, b) => a - b);
    // يجب أن تغطي الحلقة معظم الدائرة وليس نصفها فقط
    let cover = angles[angles.length - 1]! - angles[0]!;
    for (let i = 0; i < angles.length - 1; i++) {
      const candidate = 360 - (angles[i + 1]! - angles[i]!);
      if (candidate < cover) cover = candidate;
    }
    expect(cover).toBeGreaterThan(270);
  });

  it("keeps each mother's children contiguous (no mixing Widad/Ableh kids)", async () => {
    const { computeSunLayout } = await import("@/lib/printData");
    // حمود وزوجتاه وداد وعبلة — أبناء كل أم يجب أن يبقوا قطاعاً متصلاً
    const people = [
      person(1, "حمود"),
      person(2, "وداد", null, "female"),
      person(3, "عبلة", null, "female"),
      person(10, "أيمن"), // وداد — أسماء تُخلط أبجدياً مع أبناء عبلة
      person(11, "خالد"), // عبلة
      person(12, "سامي"), // وداد
      person(13, "فهد"), // عبلة
      person(14, "ياسر"), // وداد
    ];
    const rels = [
      spouseRel(1, 2),
      spouseRel(1, 3),
      parentRel(1, 10),
      parentRel(2, 10),
      parentRel(1, 11),
      parentRel(3, 11),
      parentRel(1, 12),
      parentRel(2, 12),
      parentRel(1, 13),
      parentRel(3, 13),
      parentRel(1, 14),
      parentRel(2, 14),
    ];
    const levels = assignGenerationsStable(people, rels);
    const { positions } = computeSunLayout(people, rels, levels, 1);

    const ring1 = [10, 11, 12, 13, 14]
      .map((id) => ({
        id,
        angle: ((positions.get(id)!.angle % 360) + 360) % 360,
        mother: id === 10 || id === 12 || id === 14 ? 2 : 3,
      }))
      .sort((a, b) => a.angle - b.angle);

    // يجب أن تظهر مجموعات الأمهات كقطاعات متصلة (تغيير الأم مرة واحدة فقط حول الحلقة)
    let switches = 0;
    for (let i = 0; i < ring1.length; i++) {
      const next = ring1[(i + 1) % ring1.length]!;
      if (ring1[i]!.mother !== next.mother) switches++;
    }
    expect(switches).toBe(2); // مجموعتان → انتقالان على الدائرة
  });

  it("places blood daughter's children under her not the in-law husband", async () => {
    const { computeSunLayout } = await import("@/lib/printData");
    const people = [
      person(1, "جذع"),
      person(2, "وداد", null, "female"),
      person(3, "زوج", null, "male"),
      person(4, "ابن1"),
      person(5, "ابن2"),
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
    const { edges, positions } = computeSunLayout(people, rels, levels, 1);
    expect(edges.some((e) => e.fromId === 2 && e.toId === 4)).toBe(true);
    expect(edges.some((e) => e.fromId === 2 && e.toId === 5)).toBe(true);
    expect(edges.some((e) => e.fromId === 3 && e.toId === 4)).toBe(false);
    expect(positions.get(3)?.isSpouse).toBe(true);
  });
});
