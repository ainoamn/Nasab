import { describe, expect, it } from "vitest";
import type { Person } from "@db/tables";
import {
  formatPersonShareCard,
  formatRelationPathText,
} from "@/lib/relationShare";
import { buildMultiOccasionIcs, buildOccasionIcs } from "@/lib/occasionShare";
import type { TreeOccasion } from "@/lib/treeOccasions";

function person(id: number, givenName: string, birthYear?: number): Person {
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
    birthYear: birthYear ?? null,
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
  };
}

describe("relationShare", () => {
  it("formats path narrative with hops and link", () => {
    const a = person(1, "أحمد");
    const b = person(2, "سعيد");
    const byId = new Map([
      [1, a],
      [2, b],
    ]);
    const text = formatRelationPathText({
      fromName: "أحمد",
      toName: "سعيد",
      relationLabel: "أخ",
      hops: [
        { personId: 1, via: "start" },
        { personId: 2, via: "child" },
      ],
      peopleById: byId,
      viaLabel: () => "ابن",
      url: "https://example.com/p/1",
      labels: {
        headline: "{{from}} ↔ {{to}} — {{rel}}",
        hopsHeader: "المسار:",
        linkHeader: "الرابط:",
      },
    });
    expect(text).toContain("أحمد ↔ سعيد — أخ");
    expect(text).toContain("• أحمد");
    expect(text).toContain("• سعيد");
    expect(text).toContain("https://example.com/p/1");
  });

  it("formats person card with years and kinship", () => {
    const p = person(3, "فاطمة", 1990);
    const text = formatPersonShareCard({
      person: p,
      relationLabel: "أخت",
      homeName: "أحمد",
      hopNames: ["أحمد", "أب", "فاطمة"],
      url: "https://example.com/p/3",
      labels: {
        kinship: "{{rel}} لـ {{home}}",
        pathHeader: "المسار:",
        linkHeader: "الرابط:",
      },
    });
    expect(text).toContain("فاطمة · 1990");
    expect(text).toContain("أخت لـ أحمد");
    expect(text).toContain("أحمد → أب → فاطمة");
  });
});

describe("buildOccasionIcs", () => {
  it("emits yearly all-day event with escaped text and URL", () => {
    const ev: TreeOccasion = {
      key: "b-9",
      kind: "birthday",
      month: 1,
      day: 2,
      label: "اسم;خاص",
      daysUntil: 5,
    };
    const ics = buildOccasionIcs(ev, {
      title: "عيد, خاص",
      description: "سطر1\nسطر2",
      url: "https://nasab.example/p/9",
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("DTSTART;VALUE=DATE:");
    expect(ics).toContain("RRULE:FREQ=YEARLY");
    expect(ics).toContain("SUMMARY:عيد\\, خاص");
    expect(ics).toContain("DESCRIPTION:سطر1\\nسطر2");
    expect(ics).toContain("URL:https://nasab.example/p/9");
    expect(ics).toContain("UID:nasab-b-9@nasab.app");
  });
});

describe("buildMultiOccasionIcs", () => {
  it("emits multiple VEVENTs in one calendar", () => {
    const ev1: TreeOccasion = {
      key: "b-1",
      kind: "birthday",
      month: 3,
      day: 15,
      label: "أحمد",
      daysUntil: 10,
    };
    const ev2: TreeOccasion = {
      key: "b-2",
      kind: "birthday",
      month: 7,
      day: 1,
      label: "سعيد",
      daysUntil: 40,
    };
    const ics = buildMultiOccasionIcs([
      { ev: ev1, title: "عيد أحمد", description: "desc1", url: "https://a" },
      { ev: ev2, title: "عيد سعيد", description: "desc2" },
    ]);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(ics).toContain("SUMMARY:عيد أحمد");
    expect(ics).toContain("SUMMARY:عيد سعيد");
    expect(ics).toContain("RRULE:FREQ=YEARLY");
    expect(ics).toContain("URL:https://a");
  });
});
