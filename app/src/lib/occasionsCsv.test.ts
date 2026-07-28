import { describe, expect, it } from "vitest";
import { buildOccasionsCsv } from "@/lib/occasionsCsv";
import type { TreeOccasion } from "@/lib/treeOccasions";

describe("buildOccasionsCsv", () => {
  it("adds BOM and escapes quotes/commas", () => {
    const occasions: TreeOccasion[] = [
      {
        key: "b-1",
        kind: "birthday",
        month: 7,
        day: 28,
        label: 'أحمد, "سعيد"',
        daysUntil: 0,
        person: { id: 9 } as TreeOccasion["person"],
      },
    ];
    const csv = buildOccasionsCsv(occasions, (k) =>
      k === "birthday" ? "ميلاد" : k,
    );
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"أحمد, ""سعيد"""');
    expect(csv).toContain(",9");
    expect(csv.split("\r\n")).toHaveLength(2);
  });

  it("handles empty person id", () => {
    const occasions: TreeOccasion[] = [
      {
        key: "a-1",
        kind: "anniversary",
        month: 1,
        day: 1,
        label: "أ × ب",
        daysUntil: 3,
      },
    ];
    const csv = buildOccasionsCsv(occasions, () => "زواج");
    const row = csv.split("\r\n")[1]!;
    expect(row.endsWith(",")).toBe(true);
  });
});
