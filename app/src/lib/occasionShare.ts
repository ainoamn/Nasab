import type { TreeOccasion } from "@/lib/treeOccasions";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** تاريخ مناسبات متكرر سنوياً بصيغة ICS DATE */
function nextOccurrenceDate(month: number, day: number, from = new Date()): string {
  const y = from.getFullYear();
  let d = new Date(y, month - 1, day);
  const today = new Date(y, from.getMonth(), from.getDate());
  if (d < today) d = new Date(y + 1, month - 1, day);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** ملف .ics لمناسبة عائلية مع رابط عميق في الوصف */
export function buildOccasionIcs(
  ev: TreeOccasion,
  opts: { title: string; description: string; url?: string },
): string {
  const dt = nextOccurrenceDate(ev.month, ev.day);
  const uid = `nasab-${ev.key}@nasab.app`;
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nasab//Occasions//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${dt}`,
    `SUMMARY:${icsEscape(opts.title)}`,
    `DESCRIPTION:${icsEscape(opts.description)}`,
    "RRULE:FREQ=YEARLY",
  ];
  if (opts.url) lines.push(`URL:${opts.url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export function occasionGreetingText(
  kind: TreeOccasion["kind"],
  name: string,
  personUrl: string,
  labels: { birthday: string; anniversary: string },
): string {
  const body =
    kind === "birthday"
      ? labels.birthday.replace("{{name}}", name)
      : labels.anniversary.replace("{{name}}", name);
  return `${body}\n${personUrl}`;
}
