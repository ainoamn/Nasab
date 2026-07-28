import { describe, expect, it } from "vitest";
import {
  birthSortKey,
  comparePeopleByBirth,
  formatAgeOrLifespan,
  formatBirthDate,
  formatSiblingOrdinal,
} from "@/lib/birthOrder";

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
