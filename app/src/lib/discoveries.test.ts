import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import { findDiscoveries } from "@/lib/discoveries";

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
    photoUrl: opts.photoUrl ?? "/x",
    notes: null,
    branchId: null,
    twinGroupId: opts.twinGroupId ?? null,
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

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

describe("findDiscoveries possibleTwin", () => {
  it("flags full siblings with the same birth year", () => {
    const father = person(1, { givenName: "أب", birthYear: 1970 });
    const mother = person(2, {
      givenName: "أم",
      gender: "female",
      birthYear: 1972,
    });
    const a = person(3, { givenName: "أ", birthYear: 2000 });
    const b = person(4, { givenName: "ب", birthYear: 2000 });
    const people = [father, mother, a, b];
    const rels = [parent(1, 3), parent(2, 3), parent(1, 4), parent(2, 4)];
    const hits = findDiscoveries(people, rels).filter(
      (d) => d.kind === "possibleTwin",
    );
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.some((d) => d.personId === 3 && d.otherPersonId === 4)).toBe(
      true,
    );
  });

  it("skips half-siblings and different birth years", () => {
    const father = person(1, { givenName: "أب", birthYear: 1970 });
    const mother = person(2, {
      givenName: "أم",
      gender: "female",
      birthYear: 1972,
    });
    const half = person(3, { givenName: "نصف", birthYear: 2000 });
    const otherYear = person(4, { givenName: "آخر", birthYear: 2001 });
    const people = [father, mother, half, otherYear];
    const rels = [parent(1, 3), parent(1, 4), parent(2, 4)];
    const hits = findDiscoveries(people, rels).filter(
      (d) => d.kind === "possibleTwin",
    );
    expect(hits).toEqual([]);
  });

  it("skips people already in a twin group", () => {
    const father = person(1, { givenName: "أب", birthYear: 1970 });
    const mother = person(2, {
      givenName: "أم",
      gender: "female",
      birthYear: 1972,
    });
    const a = person(3, {
      givenName: "أ",
      birthYear: 2000,
      twinGroupId: 9,
    });
    const b = person(4, {
      givenName: "ب",
      birthYear: 2000,
      twinGroupId: 9,
    });
    const people = [father, mother, a, b];
    const rels = [parent(1, 3), parent(2, 3), parent(1, 4), parent(2, 4)];
    expect(
      findDiscoveries(people, rels).some((d) => d.kind === "possibleTwin"),
    ).toBe(false);
  });
});
