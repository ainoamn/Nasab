import { describe, expect, it } from "vitest";
import { parseGedcom } from "@/lib/gedcomImport";

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
});
