import { describe, expect, it } from "vitest";
import {
  comparePeopleByBirth,
  formatSiblingLabel,
  birthSortKey,
} from "@/lib/birthOrder";
import {
  twinKindForGroup,
  twinOrderInGroup,
  twinMarkLabel,
  twinMarkWord,
  isTwin,
  twinGroupSize,
  getTwinGroupMembers,
  isFullSibling,
  twinCandidateSiblings,
  fullSiblingsOf,
} from "@/lib/twins";
import type { Person, Relationship } from "@db/tables";

function person(
  partial: Partial<Person> & { id: number; givenName: string },
): Person {
  return {
    treeId: 1,
    fatherName: null,
    kunya: null,
    laqab: null,
    clan: null,
    gender: "male",
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
    ...partial,
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

describe("comparePeopleByBirth", () => {
  it("orders by birth date first", () => {
    const a = person({ id: 2, givenName: "ب", birthYear: 2001 });
    const b = person({ id: 1, givenName: "أ", birthYear: 2000 });
    expect(comparePeopleByBirth(b, a)).toBeLessThan(0);
  });

  it("uses id as stable tie-break for same birth", () => {
    const a = person({
      id: 10,
      givenName: "أ",
      birthYear: 2000,
      birthMonth: 1,
      birthDay: 1,
    });
    const b = person({
      id: 3,
      givenName: "ب",
      birthYear: 2000,
      birthMonth: 1,
      birthDay: 1,
    });
    expect(birthSortKey(a)).toBe(birthSortKey(b));
    expect(comparePeopleByBirth(b, a)).toBeLessThan(0);
    const sorted = [a, b].sort(comparePeopleByBirth);
    expect(sorted.map((p) => p.id)).toEqual([3, 10]);
  });
});

describe("twins", () => {
  const twinA = person({
    id: 1,
    givenName: "أحمد",
    twinGroupId: 7,
    gender: "male",
    birthYear: 2010,
    birthMonth: 5,
    birthDay: 1,
  });
  const twinB = person({
    id: 2,
    givenName: "سارة",
    twinGroupId: 7,
    gender: "female",
    birthYear: 2010,
    birthMonth: 5,
    birthDay: 1,
  });
  const people = [twinA, twinB];

  it("detects twin groups", () => {
    expect(isTwin(twinA, people)).toBe(true);
    expect(twinOrderInGroup(twinA, people)).toBe(1);
    expect(twinOrderInGroup(twinB, people)).toBe(2);
    expect(twinMarkLabel(twinA, people)).toBe("ت1");
    expect(twinMarkLabel(twinA, people, "T")).toBe("T1");
  });

  it("marks mixed gender groups as mixed", () => {
    expect(twinKindForGroup(twinA, people)).toBe("mixed");
  });

  it("marks same-gender groups as identical (UI heuristic)", () => {
    const b2 = person({
      id: 3,
      givenName: "خالد",
      twinGroupId: 8,
      gender: "male",
      birthYear: 2011,
    });
    const b1 = person({
      id: 4,
      givenName: "سعيد",
      twinGroupId: 8,
      gender: "male",
      birthYear: 2011,
    });
    expect(twinKindForGroup(b1, [b1, b2])).toBe("identical");
  });

  it("labels twins in sibling format", () => {
    expect(
      formatSiblingLabel(twinA, people, { amongSiblings: 1, siblingsTotal: 2 }, "توأم"),
    ).toBe("توأم 1/2");
  });

  it("treats singleton twinGroupId as not a twin", () => {
    const alone = person({ id: 9, givenName: "وحيد", twinGroupId: 99 });
    expect(isTwin(alone, [alone])).toBe(false);
    expect(twinGroupSize(alone, [alone])).toBe(1);
    expect(twinOrderInGroup(alone, [alone])).toBeNull();
    expect(getTwinGroupMembers(alone, [alone])).toEqual([]);
  });

  it("returns null twin helpers without twinGroupId", () => {
    const solo = person({ id: 5, givenName: "فرد" });
    expect(isTwin(solo, [solo])).toBe(false);
    expect(twinGroupSize(solo, [solo])).toBe(0);
    expect(getTwinGroupMembers(solo, people)).toEqual([]);
  });

  it("lists other members of the twin group", () => {
    expect(getTwinGroupMembers(twinA, people).map((p) => p.id)).toEqual([2]);
  });
});

describe("full siblings and twin candidates", () => {
  const father = person({ id: 10, givenName: "أب" });
  const mother = person({ id: 11, givenName: "أم", gender: "female" });
  const a = person({ id: 1, givenName: "أحمد", birthYear: 2000 });
  const b = person({ id: 2, givenName: "خالد", birthYear: 2002 });
  const half = person({ id: 3, givenName: "نصف", birthYear: 2001 });
  const people = [father, mother, a, b, half];
  const fullRels = [
    parentRel(10, 1),
    parentRel(11, 1),
    parentRel(10, 2),
    parentRel(11, 2),
    parentRel(10, 3),
  ];
  const byId = new Map(people.map((p) => [p.id, p]));

  it("requires both parents for full siblings", () => {
    expect(isFullSibling(1, 2, fullRels, byId)).toBe(true);
    expect(isFullSibling(1, 3, fullRels, byId)).toBe(false);
    expect(isFullSibling(1, 1, fullRels, byId)).toBe(false);
  });

  it("lists full siblings sorted by birth", () => {
    expect(fullSiblingsOf(a, fullRels, people).map((p) => p.id)).toEqual([2]);
  });

  it("excludes existing twin-group mates from candidates", () => {
    const twinA = { ...a, twinGroupId: 7 };
    const twinB = { ...b, twinGroupId: 7 };
    const crowd = [father, mother, twinA, twinB, half];
    expect(
      twinCandidateSiblings(twinA, [], fullRels, crowd).map((p) => p.id),
    ).toEqual([]);
  });

  it("returns full-sibling candidates when parents are complete", () => {
    expect(
      twinCandidateSiblings(a, [], fullRels, people).map((p) => p.id),
    ).toEqual([2]);
  });
});

describe("twinMarkWord", () => {
  it("picks T for English locales", () => {
    expect(twinMarkWord("en")).toBe("T");
    expect(twinMarkWord("en-US")).toBe("T");
  });

  it("defaults to Arabic mark", () => {
    expect(twinMarkWord("ar")).toBe("ت");
    expect(twinMarkWord(null)).toBe("ت");
  });
});
