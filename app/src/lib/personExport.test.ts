import { describe, expect, it } from "vitest";
import {
  buildPersonVCard,
  buildPersonExportJson,
} from "@/lib/personExport";
import {
  formatAgeOrLifespan,
  formatSiblingOrdinal,
} from "@/lib/birthOrder";
import type { Person, Relationship } from "@db/tables";

function person(partial: Partial<Person> & { id: number; givenName: string }): Person {
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
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...partial,
  } as Person;
}

describe("formatAgeOrLifespan", () => {
  it("returns age for living people", () => {
    const label = formatAgeOrLifespan(
      { birthYear: 2000, birthMonth: 1, birthDay: 1, isLiving: true },
      new Date(2026, 6, 26),
    );
    expect(label).toBe("26");
  });

  it("returns lifespan for deceased", () => {
    expect(
      formatAgeOrLifespan({
        birthYear: 1920,
        deathYear: 1990,
        isLiving: false,
      }),
    ).toBe("1920–1990");
  });
});

describe("formatSiblingOrdinal", () => {
  it("formats rank when siblings exist", () => {
    expect(
      formatSiblingOrdinal({ amongSiblings: 2, siblingsTotal: 5 }),
    ).toBe("2/5");
    expect(
      formatSiblingOrdinal({ amongSiblings: 1, siblingsTotal: 1 }),
    ).toBeNull();
  });
});

describe("personExport", () => {
  it("builds vCard with name and birthday", () => {
    const p = person({
      id: 1,
      givenName: "أحمد",
      fatherName: "سعيد",
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 12,
    });
    const vcf = buildPersonVCard(p, {
      url: "https://ex/p/1",
      treeName: "آل سعيد",
    });
    expect(vcf).toContain("BEGIN:VCARD");
    expect(vcf).toContain("FN:أحمد سعيد");
    expect(vcf).toContain("BDAY:19900512");
    expect(vcf).toContain("URL:https://ex/p/1");
    expect(vcf).toContain("END:VCARD");
  });

  it("builds JSON export with parents", () => {
    const father = person({ id: 2, givenName: "سعيد", birthYear: 1960 });
    const child = person({ id: 1, givenName: "أحمد", birthYear: 1990 });
    const rel = {
      id: 1,
      treeId: 1,
      fromPersonId: 2,
      toPersonId: 1,
      type: "parent",
      marriageDay: null,
      marriageMonth: null,
      marriageYear: null,
      divorceDay: null,
      divorceMonth: null,
      divorceYear: null,
      createdAt: new Date(),
    } as Relationship;
    const json = JSON.parse(
      buildPersonExportJson(child, [child, father], [rel], {
        treeName: "شجرة",
      }),
    );
    expect(json.format).toBe("nasab-person-v1");
    expect(json.person.givenName).toBe("أحمد");
    expect(json.parents.father.givenName).toBe("سعيد");
  });
});
