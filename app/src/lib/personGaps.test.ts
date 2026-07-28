import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import { findPersonGaps } from "@/lib/personGaps";

function person(
  id: number,
  opts: Partial<Person> & { givenName: string },
): Person {
  return {
    id,
    treeId: 1,
    givenName: opts.givenName,
    fatherName: null,
    kunya: null,
    laqab: null,
    clan: null,
    gender: opts.gender ?? "male",
    birthDay: null,
    birthMonth: null,
    birthYear: opts.birthYear ?? null,
    birthPlace: null,
    deathDay: null,
    deathMonth: null,
    deathYear: null,
    deathPlace: null,
    isLiving: true,
    privacy: "family",
    photoUrl: opts.photoUrl ?? null,
    notes: null,
    branchId: null,
    twinGroupId: null,
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe("findPersonGaps", () => {
  it("flags missing photo and birth year", () => {
    const p = person(1, { givenName: "أ" });
    const gaps = findPersonGaps(p, [p], []);
    expect(gaps.some((g) => g.kind === "noPhoto")).toBe(true);
    expect(gaps.some((g) => g.kind === "noBirthYear")).toBe(true);
    expect(gaps.some((g) => g.kind === "missingBothParents")).toBe(true);
  });

  it("detects missing father only", () => {
    const child = person(1, { givenName: "ابن", birthYear: 2000, photoUrl: "/x" });
    const mom = person(2, { givenName: "أم", gender: "female" });
    const rels = [
      {
        id: 1,
        treeId: 1,
        fromPersonId: 2,
        toPersonId: 1,
        type: "parent",
        createdAt: new Date(),
      } as Relationship,
    ];
    const gaps = findPersonGaps(child, [child, mom], rels);
    expect(gaps.some((g) => g.kind === "missingFather")).toBe(true);
    expect(gaps.some((g) => g.kind === "missingMother")).toBe(false);
  });

  it("flags possible twins among full siblings with same birth year", () => {
    const father = person(1, { givenName: "أب", birthYear: 1970, photoUrl: "/f" });
    const mother = person(2, {
      givenName: "أم",
      gender: "female",
      birthYear: 1972,
      photoUrl: "/m",
    });
    const a = person(3, { givenName: "أ", birthYear: 2000, photoUrl: "/a" });
    const b = person(4, { givenName: "ب", birthYear: 2000, photoUrl: "/b" });
    const rels = [
      parent(1, 3),
      parent(2, 3),
      parent(1, 4),
      parent(2, 4),
    ];
    const gaps = findPersonGaps(a, [father, mother, a, b], rels);
    expect(gaps.some((g) => g.kind === "possibleTwin")).toBe(true);
  });

  it("does not flag possibleTwin when already linked", () => {
    const father = person(1, { givenName: "أب", birthYear: 1970, photoUrl: "/f" });
    const mother = person(2, {
      givenName: "أم",
      gender: "female",
      birthYear: 1972,
      photoUrl: "/m",
    });
    const a = person(3, { givenName: "أ", birthYear: 2000, photoUrl: "/a" });
    a.twinGroupId = 9;
    const b = person(4, { givenName: "ب", birthYear: 2000, photoUrl: "/b" });
    b.twinGroupId = 9;
    const rels = [parent(1, 3), parent(2, 3), parent(1, 4), parent(2, 4)];
    const gaps = findPersonGaps(a, [father, mother, a, b], rels);
    expect(gaps.some((g) => g.kind === "possibleTwin")).toBe(false);
  });
});

function parent(from: number, to: number): Relationship {
  return {
    id: from * 100 + to,
    treeId: 1,
    fromPersonId: from,
    toPersonId: to,
    type: "parent",
    createdAt: new Date(),
  } as Relationship;
}