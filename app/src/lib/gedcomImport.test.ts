import { describe, expect, it } from "vitest";
import { parseGedcom } from "@/lib/gedcomImport";
import { buildGedcom } from "@/lib/gedcomExport";
import type { Person } from "@db/tables";

const SAMPLE = `0 HEAD
1 GEDC
2 VERS 5.5.1
0 @I1@ INDI
1 NAME أحمد /سالم/
1 SEX M
1 BIRT
2 DATE 1950
0 @I2@ INDI
1 NAME فاطمة /علي/
1 SEX F
1 BIRT
2 DATE 12 MAR 1955
0 @I3@ INDI
1 NAME محمد /أحمد/
1 SEX M
1 BIRT
2 DATE 1980
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
0 TRLR
`;

const TWINS = `0 HEAD
0 @I1@ INDI
1 NAME توأم1 //
1 SEX M
1 _TGID 9
1 ASSO @I2@
2 RELA twin
0 @I2@ INDI
1 NAME توأم2 //
1 SEX F
1 _TGID 9
1 ASSO @I1@
2 RELA twin
0 TRLR
`;

describe("parseGedcom", () => {
  it("parses individuals and family links", () => {
    const parsed = parseGedcom(SAMPLE);
    expect(parsed.people).toHaveLength(3);
    expect(parsed.people.find((p) => p.key === "I2")?.gender).toBe("female");
    expect(parsed.people.find((p) => p.key === "I2")?.birthMonth).toBe(3);
    expect(parsed.links.some((l) => l.type === "spouse")).toBe(true);
    expect(
      parsed.links.filter((l) => l.type === "parent" && l.toKey === "I3"),
    ).toHaveLength(2);
  });

  it("parses twin groups from _TGID and ASSO", () => {
    const parsed = parseGedcom(TWINS);
    expect(parsed.people).toHaveLength(2);
    const keys = parsed.people.map((p) => p.twinGroupKey);
    expect(keys[0]).toBeTruthy();
    expect(keys[0]).toBe(keys[1]);
  });

  it("round-trips twin groups through export then import", () => {
    const people = [
      {
        id: 1,
        treeId: 1,
        givenName: "أ",
        fatherName: null,
        kunya: null,
        laqab: null,
        clan: null,
        gender: "male",
        birthDay: 1,
        birthMonth: 1,
        birthYear: 2000,
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
        twinGroupId: 5,
        createdById: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: 2,
        treeId: 1,
        givenName: "ب",
        fatherName: null,
        kunya: null,
        laqab: null,
        clan: null,
        gender: "male",
        birthDay: 1,
        birthMonth: 1,
        birthYear: 2000,
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
        twinGroupId: 5,
        createdById: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ] as Person[];
    const ged = buildGedcom("rt", people, []);
    const parsed = parseGedcom(ged);
    expect(parsed.people.every((p) => p.twinGroupKey === "5")).toBe(true);
  });
});
