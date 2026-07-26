import type { Person } from "@db/tables";
import type { PersonGap } from "@/lib/personGaps";

/** نص واتساب لنواقص ملف شخص — جاهز للمشاركة مع العائلة */
export function formatPersonGapsDigest(opts: {
  personName: string;
  gaps: PersonGap[];
  gapLabel: (kind: PersonGap["kind"]) => string;
  url: string;
  labels: {
    title: string; // "{{name}}"
    linkHeader: string;
    empty: string;
  };
}): string {
  const lines: string[] = [
    opts.labels.title.replace("{{name}}", opts.personName),
  ];
  if (opts.gaps.length === 0) {
    lines.push(opts.labels.empty);
  } else {
    for (const g of opts.gaps) {
      lines.push(`• ${opts.gapLabel(g.kind)}`);
    }
  }
  lines.push("", opts.labels.linkHeader, opts.url);
  return lines.join("\n");
}
