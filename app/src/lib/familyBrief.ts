import type { TreeOccasion } from "@/lib/treeOccasions";

/** ملخص عائلي جاهز للنسخ في واتساب: اليوم + ٧ أيام + نواقص البحث */
export function formatFamilyBrief(opts: {
  today: TreeOccasion[];
  week: TreeOccasion[];
  researchCount: number;
  urlFor: (ev: TreeOccasion) => string | null;
  labels: {
    title: string;
    todayHeader: string;
    weekHeader: string;
    emptyToday: string;
    emptyWeek: string;
    birthday: string;
    anniversary: string;
    todayTag: string;
    inDays: string; // "{{n}}"
    researchFooter: string; // "{{count}}"
  };
}): string {
  const lines: string[] = [opts.labels.title, ""];

  lines.push(opts.labels.todayHeader);
  if (opts.today.length === 0) {
    lines.push(opts.labels.emptyToday);
  } else {
    for (const ev of opts.today) {
      const kind =
        ev.kind === "birthday" ? opts.labels.birthday : opts.labels.anniversary;
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
      const kind =
        ev.kind === "birthday" ? opts.labels.birthday : opts.labels.anniversary;
      const when = opts.labels.inDays.replace("{{n}}", String(ev.daysUntil));
      const url = opts.urlFor(ev);
      lines.push(`• ${ev.label} — ${kind} (${when})`);
      if (url) lines.push(`  ${url}`);
    }
  }

  if (opts.researchCount > 0) {
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
