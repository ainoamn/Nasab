import { describe, expect, it } from "vitest";
import {
  buildMultiOccasionIcs,
  buildOccasionIcs,
  occasionGreetingText,
} from "@/lib/occasionShare";
import type { TreeOccasion } from "@/lib/treeOccasions";

const labels = {
  birthday: "عيد ميلاد {{name}}",
  anniversary: "ذكرى زواج {{name}}",
  memorial: "ذكرى {{name}}",
};

describe("occasionGreetingText", () => {
  it("fills name and appends URL", () => {
    expect(
      occasionGreetingText("birthday", "أحمد", "https://x/1", labels),
    ).toBe("عيد ميلاد أحمد\nhttps://x/1");
    expect(
      occasionGreetingText("memorial", "سعيد", "https://x/2", labels),
    ).toContain("ذكرى سعيد");
  });
});

describe("buildOccasionIcs", () => {
  it("escapes ICS specials and includes yearly rule", () => {
    const ev: TreeOccasion = {
      key: "b-3",
      kind: "birthday",
      month: 12,
      day: 31,
      label: "اسم;خاص,سطر",
      daysUntil: 1,
    };
    const ics = buildOccasionIcs(ev, {
      title: "عنوان, خاص",
      description: "س1\nس2",
      url: "https://nasab.example/p/3",
    });
    expect(ics).toContain("SUMMARY:عنوان\\, خاص");
    expect(ics).toContain("DESCRIPTION:س1\\nس2");
    expect(ics).toContain("URL:https://nasab.example/p/3");
    expect(ics).toContain("RRULE:FREQ=YEARLY");
    expect(ics).toContain("UID:nasab-b-3@nasab.app");
  });
});

describe("buildMultiOccasionIcs", () => {
  it("emits multiple events without URL when omitted", () => {
    const items = [
      {
        ev: {
          key: "b-1",
          kind: "birthday" as const,
          month: 1,
          day: 1,
          label: "أ",
          daysUntil: 0,
        },
        title: "أ",
        description: "د1",
      },
      {
        ev: {
          key: "m-2",
          kind: "anniversary" as const,
          month: 2,
          day: 2,
          label: "ب",
          daysUntil: 1,
        },
        title: "ب",
        description: "د2",
        url: "https://x/2",
      },
    ];
    const ics = buildMultiOccasionIcs(items);
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(ics).toContain("URL:https://x/2");
    expect(ics.indexOf("URL:")).toBe(ics.lastIndexOf("URL:"));
  });
});
