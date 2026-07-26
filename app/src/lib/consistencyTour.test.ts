import { describe, expect, it } from "vitest";
import { buildConsistencyTourItems } from "@/lib/consistencyTour";
import type { Discovery } from "@/lib/discoveries";

describe("buildConsistencyTourItems", () => {
  it("keeps quality kinds and skips dismissed", () => {
    const discoveries: Discovery[] = [
      {
        kind: "missingFather",
        personId: 1,
        personName: "أ",
      },
      {
        kind: "deathBeforeBirth",
        personId: 2,
        personName: "ب",
      },
      {
        kind: "possibleDuplicate",
        personId: 3,
        personName: "ج",
        otherPersonId: 4,
        otherPersonName: "د",
      },
    ];
    const items = buildConsistencyTourItems(discoveries, [
      "deathBeforeBirth:2:0",
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("possibleDuplicate");
  });
});
