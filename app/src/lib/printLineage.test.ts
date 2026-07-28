import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/schema";
import {
  buildSpouseNotesMap,
  collectMarriageLinks,
  preferredParentId,
} from "@/lib/printLineage";

function person(
  id: number,
  givenName: string,
  fatherName: string | null = null,
  gender: "male" | "female" = "male",
): Person {
  return {
    id,
    treeId: 1,
    givenName,
    fatherName,
    gender,
    isLiving: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Person;
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
    id: a * 10000 + b,
    treeId: 1,
    fromPersonId: a,
    toPersonId: b,
    type: "spouse",
    createdAt: new Date(),
  } as Relationship;
}

describe("printLineage", () => {
  it("prefers father when both parents are in the set", () => {
    const people = [
      person(1, "أسعد"),
      person(2, "آسية", null, "female"),
      person(3, "بلقيس", null, "female"),
    ];
    const rels = [
      spouseRel(1, 2),
      parentRel(1, 3),
      parentRel(2, 3),
    ];
    const byId = new Map(people.map((p) => [p.id, p]));
    expect(preferredParentId(3, rels, byId)).toBe(1);
  });

  it("falls back to mother when father is outside the set", () => {
    const people = [
      person(2, "آسية", null, "female"),
      person(3, "بلقيس", null, "female"),
    ];
    const rels = [parentRel(2, 3), parentRel(99, 3)];
    const byId = new Map(people.map((p) => [p.id, p]));
    expect(preferredParentId(3, rels, byId)).toBe(2);
  });

  it("builds spouse notes for cousin couples", () => {
    const people = [
      person(1, "أسعد"),
      person(2, "آسية", null, "female"),
    ];
    const rels = [spouseRel(1, 2)];
    const notes = buildSpouseNotesMap(people, rels);
    expect(notes.get(1)).toContain("زوجة آسية");
    expect(notes.get(2)).toContain("زوج أسعد");
  });

  it("collects marriage links between visible spouses", () => {
    const people = [
      person(1, "أسعد"),
      person(2, "آسية", null, "female"),
      person(3, "خميس"),
    ];
    const rels = [spouseRel(1, 2)];
    const links = collectMarriageLinks(people, rels);
    expect(links).toEqual([{ fromId: 1, toId: 2 }]);
  });
});
