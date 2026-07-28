import { describe, expect, it } from "vitest";
import type { Person, Relationship } from "@db/tables";
import { buildGedcom } from "@/lib/gedcomExport";
import { findDiscoveries } from "@/lib/discoveries";

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
    birthYear: 1990,
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
    id: from * 100 + to,
    treeId: 1,
    fromPersonId: from,
    toPersonId: to,
    type: "parent",
    createdAt: new Date(),
  } as Relationship;
}

describe("buildGedcom", () => {
  it("emits individuals and trailer", () => {
    const people = [person(1, "حمدان"), person(2, "شيخة", "female")];
    const ged = buildGedcom("اختبار", people, []);
    expect(ged).toContain("0 HEAD");
    expect(ged).toContain("0 @I1@ INDI");
    expect(ged).toContain("1 SEX M");
    expect(ged).toContain("1 SEX F");
    expect(ged.trim().endsWith("0 TRLR")).toBe(true);
  });
});

describe("findDiscoveries", () => {
  it("flags missing father when only mother exists", () => {
    const people = [person(1, "ابن"), person(2, "أم", "female")];
    const rels = [parentRel(2, 1)];
    const d = findDiscoveries(people, rels);
    expect(d.some((x) => x.kind === "missingFather" && x.personId === 1)).toBe(
      true,
    );
  });

  it("flags death before birth", () => {
    const p = person(1, "شخص");
    p.birthYear = 1990;
    p.deathYear = 1980;
    p.isLiving = false;
    const d = findDiscoveries([p], []);
    expect(d.some((x) => x.kind === "deathBeforeBirth")).toBe(true);
  });
});
