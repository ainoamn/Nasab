import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import {
  classifyRelationPath,
  findRelationPath,
} from "@/lib/relationPath";

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

describe("findRelationPath", () => {
  it("finds father path", () => {
    const people = [person(1, "ابن"), person(2, "أب")];
    const rels = [parent(2, 1)];
    const path = findRelationPath(1, 2, people, rels);
    expect(path?.map((h) => h.personId)).toEqual([1, 2]);
    expect(path?.[1].via).toBe("parent");
    expect(
      classifyRelationPath(1, 2, people, rels, path),
    ).toBe("father");
  });

  it("finds sibling via shared parent", () => {
    const people = [
      person(1, "أحمد"),
      person(2, "سعيد"),
      person(3, "أب"),
    ];
    const rels = [parent(3, 1), parent(3, 2)];
    const path = findRelationPath(1, 2, people, rels);
    expect(path?.map((h) => h.personId)).toEqual([1, 3, 2]);
    expect(classifyRelationPath(1, 2, people, rels, path)).toBe("brother");
  });

  it("classifies uncle", () => {
    // 1 = ego, 2 = father, 3 = grandfather, 4 = uncle
    const people = [
      person(1, "حفيد"),
      person(2, "أب"),
      person(3, "جد"),
      person(4, "عم"),
    ];
    const rels = [parent(2, 1), parent(3, 2), parent(3, 4)];
    const path = findRelationPath(1, 4, people, rels);
    expect(classifyRelationPath(1, 4, people, rels, path)).toBe("uncle");
  });

  it("returns null when disconnected", () => {
    const people = [person(1, "أ"), person(2, "ب")];
    expect(findRelationPath(1, 2, people, [])).toBeNull();
  });
});
