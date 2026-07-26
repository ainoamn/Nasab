import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import { computeTreeCompleteness } from "@/lib/treeCompleteness";

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
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe("computeTreeCompleteness", () => {
  it("returns 0 for empty tree", () => {
    expect(computeTreeCompleteness([], []).score).toBe(0);
  });

  it("scores higher when data is richer", () => {
    const sparse = [person(1, { givenName: "أ" })];
    const rich = [
      person(1, {
        givenName: "أب",
        birthYear: 1960,
        photoUrl: "/a.jpg",
      }),
      person(2, {
        givenName: "أم",
        gender: "female",
        birthYear: 1965,
        photoUrl: "/b.jpg",
      }),
      person(3, { givenName: "ابن", birthYear: 1990, photoUrl: "/c.jpg" }),
    ];
    const rels: Relationship[] = [
      {
        id: 1,
        treeId: 1,
        fromPersonId: 1,
        toPersonId: 3,
        type: "parent",
        createdAt: new Date(),
      } as Relationship,
      {
        id: 2,
        treeId: 1,
        fromPersonId: 2,
        toPersonId: 3,
        type: "parent",
        createdAt: new Date(),
      } as Relationship,
      {
        id: 3,
        treeId: 1,
        fromPersonId: 1,
        toPersonId: 2,
        type: "spouse",
        createdAt: new Date(),
      } as Relationship,
    ];
    const low = computeTreeCompleteness(sparse, []).score;
    const high = computeTreeCompleteness(rich, rels).score;
    expect(high).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(50);
  });
});
