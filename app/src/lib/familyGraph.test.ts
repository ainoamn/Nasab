import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import {
  buildSpousesOf,
  collectFocusedSubgraph,
  getParents,
} from "@/lib/familyGraph";

function p(
  id: number,
  givenName: string,
  gender: "male" | "female" = "male",
  fatherName: string | null = null,
): Person {
  return {
    id,
    treeId: 1,
    givenName,
    fatherName,
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
    marriageDay: null,
    marriageMonth: null,
    marriageYear: null,
    divorceDay: null,
    divorceMonth: null,
    divorceYear: null,
    createdAt: new Date(),
  };
}

function spouse(a: number, b: number): Relationship {
  return {
    id: a * 1000 + b,
    treeId: 1,
    fromPersonId: a,
    toPersonId: b,
    type: "spouse",
    marriageDay: null,
    marriageMonth: null,
    marriageYear: null,
    divorceDay: null,
    divorceMonth: null,
    divorceYear: null,
    createdAt: new Date(),
  };
}

describe("familyGraph lineage", () => {
  it("builds spouse map both directions", () => {
    const map = buildSpousesOf([spouse(1, 2)]);
    expect(map.get(1)).toEqual([2]);
    expect(map.get(2)).toEqual([1]);
  });

  it("resolves both parents", () => {
    const people = [p(1, "أب"), p(2, "أم", "female"), p(3, "ابن")];
    const rels = [parent(1, 3), parent(2, 3), spouse(1, 2)];
    const parents = getParents(3, rels, new Map(people.map((x) => [x.id, x])));
    expect(parents.fatherId).toBe(1);
    expect(parents.motherId).toBe(2);
  });

  it("focus subgraph walks up both parent lines", () => {
    const people = [
      p(1, "جد"),
      p(2, "جدة", "female"),
      p(3, "أب"),
      p(4, "أم", "female"),
      p(5, "ابن"),
    ];
    const rels = [
      parent(1, 3),
      parent(2, 3),
      parent(3, 5),
      parent(4, 5),
      spouse(1, 2),
      spouse(3, 4),
    ];
    const sub = collectFocusedSubgraph(5, people, rels);
    const ids = new Set(sub.people.map((x) => x.id));
    expect(ids.has(1)).toBe(true);
    expect(ids.has(2)).toBe(true);
    expect(ids.has(3)).toBe(true);
    expect(ids.has(4)).toBe(true);
    expect(ids.has(5)).toBe(true);
  });
});
