import { describe, expect, it } from "vitest";
import { limitPeopleByGenerations } from "@/lib/generationLimit";
import type { Person, Relationship } from "@db/tables";

function person(id: number, name: string): Person {
  return {
    id,
    treeId: 1,
    givenName: name,
    gender: "male",
    isLiving: true,
  } as Person;
}

function parentRel(id: number, parent: number, child: number): Relationship {
  return {
    id,
    treeId: 1,
    type: "parent",
    fromPersonId: parent,
    toPersonId: child,
  } as Relationship;
}

function spouseRel(id: number, a: number, b: number): Relationship {
  return {
    id,
    treeId: 1,
    type: "spouse",
    fromPersonId: a,
    toPersonId: b,
  } as Relationship;
}

describe("limitPeopleByGenerations", () => {
  const root = person(1, "جذر");
  const child = person(2, "ابن");
  const grand = person(3, "حفيد");
  const spouse = person(4, "زوج");
  const people = [root, child, grand, spouse];
  const rels = [
    parentRel(1, 1, 2),
    parentRel(2, 2, 3),
    spouseRel(3, 2, 4),
  ];

  it("returns all when maxGenerations is high or empty", () => {
    expect(limitPeopleByGenerations([], [], 3)).toEqual({
      people: [],
      rels: [],
    });
    expect(limitPeopleByGenerations(people, rels, 99).people).toHaveLength(4);
  });

  it("keeps N generations from root and spouse of kept people", () => {
    const limited = limitPeopleByGenerations(people, rels, 2, 1);
    const ids = limited.people.map((p) => p.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2, 4]);
    expect(limited.people.some((p) => p.id === 3)).toBe(false);
  });
});
