import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import { collectCloseFamily } from "@/lib/closeFamily";

function person(
  id: number,
  givenName: string,
  gender: "male" | "female" = "male",
): Person {
  return {
    id,
    treeId: 1,
    givenName,
    fatherName: null,
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

describe("collectCloseFamily", () => {
  it("keeps parents siblings spouse and children only", () => {
    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "عم"),
      person(4, "ابن"),
      person(5, "زوجة", "female"),
      person(6, "حفيد"),
    ];
    const rels = [
      parentRel(1, 2),
      parentRel(1, 3),
      parentRel(2, 4),
      spouseRel(4, 5),
      parentRel(4, 6),
    ];
    const close = collectCloseFamily(4, people, rels);
    const ids = close.people.map((p) => p.id).sort();
    expect(ids).toEqual([2, 4, 5, 6]);
    expect(ids).not.toContain(1);
    expect(ids).not.toContain(3);
  });
});
