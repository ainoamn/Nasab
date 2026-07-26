import { describe, expect, it } from "vitest";
import { formatFamilyBrief } from "@/lib/familyBrief";
import {
  getRecentRelates,
  pushRecentRelate,
} from "@/lib/recentRelates";
import type { TreeOccasion } from "@/lib/treeOccasions";

describe("formatFamilyBrief", () => {
  it("includes today, week, and research footer", () => {
    const today: TreeOccasion[] = [
      {
        key: "b-1",
        kind: "birthday",
        month: 7,
        day: 26,
        label: "أحمد",
        daysUntil: 0,
      },
    ];
    const week: TreeOccasion[] = [
      {
        key: "b-2",
        kind: "birthday",
        month: 7,
        day: 28,
        label: "سعيد",
        daysUntil: 2,
      },
    ];
    const text = formatFamilyBrief({
      today,
      week,
      researchCount: 3,
      researchItems: [
        {
          name: "خالد",
          gapLabel: "سنة الميلاد ناقصة",
          url: "https://ex/p/9",
        },
      ],
      urlFor: (ev) => `https://ex/${ev.key}`,
      labels: {
        title: "ملخص العائلة",
        todayHeader: "اليوم",
        weekHeader: "خلال أسبوع",
        emptyToday: "لا شيء اليوم",
        emptyWeek: "لا شيء قريباً",
        birthday: "عيد ميلاد",
        anniversary: "زواج",
        todayTag: "اليوم",
        inDays: "خلال {{n}} يوم",
        researchHeader: "أولويات البحث:",
        researchFooter: "{{count}} نقص بحث متبقٍ",
      },
    });
    expect(text).toContain("أحمد");
    expect(text).toContain("سعيد");
    expect(text).toContain("https://ex/b-1");
    expect(text).toContain("خالد");
    expect(text).toContain("سنة الميلاد ناقصة");
    expect(text).toContain("3 نقص بحث");
  });
});

describe("recentRelates", () => {
  it("stores normalized unique pairs", () => {
    const store = new Map<string, string>();
    const mem = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: mem,
      configurable: true,
    });

    const treeId = 900001;
    localStorage.removeItem(`nasab:recentRelates:${treeId}`);
    pushRecentRelate(treeId, 5, 2);
    pushRecentRelate(treeId, 2, 5);
    pushRecentRelate(treeId, 3, 4);
    const list = getRecentRelates(treeId);
    expect(list[0]).toEqual({ a: 3, b: 4 });
    expect(list.some((p) => p.a === 2 && p.b === 5)).toBe(true);
    expect(list.filter((p) => p.a === 2 && p.b === 5)).toHaveLength(1);
  });
});
