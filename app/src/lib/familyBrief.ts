import type { TreeOccasion } from "@/lib/treeOccasions";

export type FamilyBriefResearchItem = {
  name: string;
  gapLabel: string;
  url: string | null;
};

/** ملخص عائلي جاهز للنسخ في واتساب: اليوم + ٧ أيام + قائمة نواقص البحث */
export function formatFamilyBrief(opts: {
  today: TreeOccasion[];
  week: TreeOccasion[];
  researchCount: number;
  researchItems?: FamilyBriefResearchItem[];
  urlFor: (ev: TreeOccasion) => string | null;
  labels: {
    title: string;
    todayHeader: string;
    weekHeader: string;
    emptyToday: string;
    emptyWeek: string;
    birthday: string;
    anniversary: string;
    memorial: string;
    todayTag: string;
    inDays: string; // "{{n}}"
    researchFooter: string; // "{{count}}"
    researchHeader?: string;
  };
}): string {
  const lines: string[] = [opts.labels.title, ""];

  const kindLabel = (kind: TreeOccasion["kind"]) => {
    if (kind === "birthday") return opts.labels.birthday;
    if (kind === "memorial") return opts.labels.memorial;
    return opts.labels.anniversary;
  };

  lines.push(opts.labels.todayHeader);
  if (opts.today.length === 0) {
    lines.push(opts.labels.emptyToday);
  } else {
    for (const ev of opts.today) {
      const kind = kindLabel(ev.kind);
      const url = opts.urlFor(ev);
      lines.push(`• ${ev.label} — ${kind} (${opts.labels.todayTag})`);
      if (url) lines.push(`  ${url}`);
    }
  }

  lines.push("", opts.labels.weekHeader);
  if (opts.week.length === 0) {
    lines.push(opts.labels.emptyWeek);
  } else {
    for (const ev of opts.week) {
      const kind = kindLabel(ev.kind);
      const when = opts.labels.inDays.replace("{{n}}", String(ev.daysUntil));
      const url = opts.urlFor(ev);
      lines.push(`• ${ev.label} — ${kind} (${when})`);
      if (url) lines.push(`  ${url}`);
    }
  }

  const items = opts.researchItems ?? [];
  if (items.length > 0) {
    lines.push(
      "",
      opts.labels.researchHeader ??
        opts.labels.researchFooter.replace(
          "{{count}}",
          String(opts.researchCount || items.length),
        ),
    );
    for (const item of items) {
      lines.push(`• ${item.name} — ${item.gapLabel}`);
      if (item.url) lines.push(`  ${item.url}`);
    }
    if (opts.researchCount > items.length) {
      lines.push(
        opts.labels.researchFooter.replace(
          "{{count}}",
          String(opts.researchCount),
        ),
      );
    }
  } else if (opts.researchCount > 0) {
    lines.push(
      "",
      opts.labels.researchFooter.replace(
        "{{count}}",
        String(opts.researchCount),
      ),
    );
  }

  return lines.join("\n");
}
