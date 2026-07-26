import type { TreeOccasion } from "@/lib/treeOccasions";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** تصدير مناسبات الشجرة كـ CSV للمشاركة مع الباحثين */
export function buildOccasionsCsv(
  occasions: TreeOccasion[],
  kindLabel: (kind: TreeOccasion["kind"]) => string,
): string {
  const header = ["kind", "kind_label", "label", "month", "day", "days_until", "person_id"];
  const rows = occasions.map((ev) =>
    [
      ev.kind,
      kindLabel(ev.kind),
      ev.label,
      String(ev.month),
      String(ev.day),
      String(ev.daysUntil),
      ev.person ? String(ev.person.id) : "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return ["\uFEFF" + header.join(","), ...rows].join("\r\n");
}

export function downloadOccasionsCsv(
  filename: string,
  occasions: TreeOccasion[],
  kindLabel: (kind: TreeOccasion["kind"]) => string,
): void {
  const content = buildOccasionsCsv(occasions, kindLabel);
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
