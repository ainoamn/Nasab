import { describe, expect, it } from "vitest";
import type { Person } from "@db/tables";
import { personDisplayLabel, personMatchesQuery } from "@/lib/personDisplay";

function person(
  id: number,
  givenName: string,
  extras: Partial<Person> = {},
): Person {
  return {
    id,
    treeId: 1,
    givenName,
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
    ...extras,
  } as Person;
}

describe("personDisplayLabel", () => {
  it("adds father and kunya parts", () => {
    const p = person(1, "أحمد", { fatherName: "سعيد", kunya: "أبو علي" });
    expect(personDisplayLabel(p, [p])).toBe("أحمد (سعيد) [أبو علي]");
  });

  it("appends #id when names collide", () => {
    const a = person(1, "أحمد");
    const b = person(2, "أحمد");
    expect(personDisplayLabel(a, [a, b])).toContain("#1");
  });
});

describe("personMatchesQuery", () => {
  it("matches empty query", () => {
    expect(personMatchesQuery(person(1, "أ"), "")).toBe(true);
  });

  it("matches clan and id", () => {
    const p = person(9, "خالد", { clan: "بني فلان" });
    expect(personMatchesQuery(p, "فلان")).toBe(true);
    expect(personMatchesQuery(p, "9")).toBe(true);
    expect(personMatchesQuery(p, "لا يوجد")).toBe(false);
  });
});
