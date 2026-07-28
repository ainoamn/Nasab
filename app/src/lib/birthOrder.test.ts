import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import {
  birthSortKey,
  comparePeopleByBirth,
  computePersonRanks,
  formatAgeOrLifespan,
  formatBirthDate,
  formatSiblingLabel,
  formatSiblingOrdinal,
} from "@/lib/birthOrder";

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

describe("birthSortKey", () => {
  it("puts missing dates last", () => {
    expect(birthSortKey({ birthYear: 2000 })).toBeLessThan(
      birthSortKey({ birthYear: null }),
    );
  });
});

describe("comparePeopleByBirth", () => {
  it("breaks ties by id", () => {
    const a = { id: 2, birthYear: 2000, birthMonth: 1, birthDay: 1 };
    const b = { id: 1, birthYear: 2000, birthMonth: 1, birthDay: 1 };
    expect(comparePeopleByBirth(a, b)).toBeGreaterThan(0);
  });
});

describe("formatBirthDate", () => {
  it("returns year only when month/day missing", () => {
    expect(formatBirthDate({ birthYear: 1990 })).toBe("1990");
  });

  it("returns null without year", () => {
    expect(formatBirthDate({ birthMonth: 5, birthDay: 1 })).toBeNull();
  });

  it("formats month/year", () => {
    expect(formatBirthDate({ birthYear: 1990, birthMonth: 3 })).toBe("3/1990");
  });
});

describe("formatAgeOrLifespan", () => {
  it("shows lifespan for deceased", () => {
    expect(
      formatAgeOrLifespan({
        birthYear: 1950,
        deathYear: 2020,
        isLiving: false,
      }),
    ).toBe("1950–2020");
  });

  it("computes age for living", () => {
    const now = new Date(2026, 6, 28);
    expect(
      formatAgeOrLifespan(
        { birthYear: 2000, birthMonth: 1, birthDay: 1, isLiving: true },
        now,
      ),
    ).toBe("26");
  });
});

describe("formatSiblingOrdinal", () => {
  it("returns null for only child", () => {
    expect(
      formatSiblingOrdinal({ amongSiblings: 1, siblingsTotal: 1 }),
    ).toBeNull();
  });

  it("formats rank among siblings", () => {
    expect(
      formatSiblingOrdinal({ amongSiblings: 2, siblingsTotal: 5 }),
    ).toBe("2/5");
  });
});

describe("computePersonRanks", () => {
  it("ranks siblings and same-gender siblings by birth", () => {
    const father = person({ id: 10, givenName: "أب" });
    const older = person({
      id: 1,
      givenName: "أكبر",
      birthYear: 1990,
      gender: "male",
    });
    const sister = person({
      id: 2,
      givenName: "أخت",
      birthYear: 1992,
      gender: "female",
    });
    const younger = person({
      id: 3,
      givenName: "أصغر",
      birthYear: 1995,
      gender: "male",
    });
    const people = [father, older, sister, younger];
    const rels = [parentRel(10, 1), parentRel(10, 2), parentRel(10, 3)];
    const ranks = computePersonRanks(younger, people, rels);
    expect(ranks.amongSiblings).toBe(3);
    expect(ranks.siblingsTotal).toBe(3);
    expect(ranks.amongSameGender).toBe(2);
    expect(ranks.sameGenderTotal).toBe(2);
  });
});

describe("formatSiblingLabel", () => {
  it("prefers twin mark over ordinal when twin group has 2+", () => {
    const a = person({
      id: 1,
      givenName: "أ",
      twinGroupId: 7,
      birthYear: 2000,
      birthMonth: 1,
      birthDay: 1,
    });
    const b = person({
      id: 2,
      givenName: "ب",
      twinGroupId: 7,
      birthYear: 2000,
      birthMonth: 1,
      birthDay: 2,
    });
    expect(
      formatSiblingLabel(
        a,
        [a, b],
        { amongSiblings: 1, siblingsTotal: 2 },
        "توأم",
      ),
    ).toBe("توأم 1/2");
  });
});
