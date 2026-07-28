import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import { relationToFocus } from "@/lib/relationshipLabel";

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

describe("relationToFocus", () => {
  const people = [
    person(1, "محور"),
    person(2, "أب"),
    person(3, "أم", "female"),
    person(4, "أخ"),
    person(5, "أخت", "female"),
    person(6, "زوجة", "female"),
    person(7, "ابن"),
    person(8, "بنت", "female"),
    person(9, "جد"),
    person(10, "حفيد"),
    person(99, "غريب"),
  ];
  const rels = [
    parentRel(9, 2),
    parentRel(2, 1),
    parentRel(3, 1),
    parentRel(2, 4),
    parentRel(3, 4),
    parentRel(2, 5),
    parentRel(3, 5),
    spouseRel(1, 6),
    parentRel(1, 7),
    parentRel(6, 7),
    parentRel(1, 8),
    parentRel(6, 8),
    parentRel(7, 10),
  ];

  it("labels core close-family roles", () => {
    expect(relationToFocus(1, 1, people, rels)).toBe("self");
    expect(relationToFocus(1, 2, people, rels)).toBe("father");
    expect(relationToFocus(1, 3, people, rels)).toBe("mother");
    expect(relationToFocus(1, 4, people, rels)).toBe("brother");
    expect(relationToFocus(1, 5, people, rels)).toBe("sister");
    expect(relationToFocus(1, 6, people, rels)).toBe("spouse");
    expect(relationToFocus(1, 7, people, rels)).toBe("son");
    expect(relationToFocus(1, 8, people, rels)).toBe("daughter");
  });

  it("labels grandparents and grandchildren", () => {
    expect(relationToFocus(1, 9, people, rels)).toBe("grandfather");
    expect(relationToFocus(1, 10, people, rels)).toBe("grandson");
  });

  it("falls back to relative", () => {
    expect(relationToFocus(1, 99, people, rels)).toBe("relative");
  });
});
