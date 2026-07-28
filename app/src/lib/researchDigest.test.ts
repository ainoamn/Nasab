import { describe, expect, it } from "vitest";
import { formatPersonGapsDigest } from "@/lib/researchDigest";
import { buildOccasionsCsv } from "@/lib/occasionsCsv";
import type { TreeOccasion } from "@/lib/treeOccasions";

describe("formatPersonGapsDigest", () => {
  it("lists gaps and link", () => {
    const text = formatPersonGapsDigest({
      personName: "أحمد",
      gaps: [
        { kind: "noBirthYear" },
        { kind: "missingFather" },
      ],
      gapLabel: (k) => (k === "noBirthYear" ? "سنة الميلاد" : "الأب"),
      url: "https://ex/p/1",
      labels: {
        title: "نواقص {{name}}",
        linkHeader: "الرابط:",
        empty: "لا نواقص",
      },
    });
    expect(text).toContain("أحمد");
    expect(text).toContain("سنة الميلاد");
    expect(text).toContain("الأب");
    expect(text).toContain("https://ex/p/1");
  });

  it("includes twin peer name when present", () => {
    const text = formatPersonGapsDigest({
      personName: "سعيد",
      gaps: [
        {
          kind: "possibleTwin",
          otherPersonId: 4,
          otherPersonName: "خالد",
        },
      ],
      gapLabel: () => "توأم محتمل",
      url: "https://ex/p/3",
      labels: {
        title: "نواقص {{name}}",
        linkHeader: "الرابط:",
        empty: "لا نواقص",
      },
    });
    expect(text).toContain("توأم محتمل (خالد)");
  });
});

describe("buildOccasionsCsv", () => {
  it("builds UTF-8 BOM CSV rows", () => {
    const occasions: TreeOccasion[] = [
      {
        key: "b-1",
        kind: "birthday",
        month: 7,
        day: 26,
        label: "سعيد",
        daysUntil: 0,
      },
    ];
    const csv = buildOccasionsCsv(occasions, () => "عيد ميلاد");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("birthday");
    expect(csv).toContain("سعيد");
    expect(csv).toContain("عيد ميلاد");
  });
});
