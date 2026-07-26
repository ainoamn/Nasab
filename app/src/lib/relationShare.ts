import type { Person } from "@db/tables";
import type { PathHop, PathVia } from "@/lib/relationPath";
import { formatBirthYear } from "@/lib/printData";

/** نص مسار قرابة جاهز للنسخ في واتساب/رسائل */
export function formatRelationPathText(opts: {
  fromName: string;
  toName: string;
  relationLabel: string;
  hops: PathHop[];
  peopleById: Map<number, Person>;
  viaLabel: (via: Exclude<PathVia, "start">) => string;
  url: string;
  labels: {
    headline: string;
    hopsHeader: string;
    linkHeader: string;
    commonAncestor?: string; // "{{name}}"
  };
  commonAncestorName?: string | null;
}): string {
  const lines: string[] = [
    opts.labels.headline
      .replace("{{from}}", opts.fromName)
      .replace("{{to}}", opts.toName)
      .replace("{{rel}}", opts.relationLabel),
  ];

  if (opts.commonAncestorName && opts.labels.commonAncestor) {
    lines.push(
      opts.labels.commonAncestor.replace("{{name}}", opts.commonAncestorName),
    );
  }

  lines.push("", opts.labels.hopsHeader);

  for (const hop of opts.hops) {
    const p = opts.peopleById.get(hop.personId);
    if (!p) continue;
    if (hop.via !== "start") {
      lines.push(`  ← ${opts.viaLabel(hop.via)}`);
    }
    lines.push(`• ${p.givenName}`);
  }

  lines.push("", opts.labels.linkHeader, opts.url);
  return lines.join("\n");
}

/** بطاقة شخص قصيرة: الاسم · السنوات · القرابة · الرابط */
export function formatPersonShareCard(opts: {
  person: Person;
  relationLabel?: string | null;
  homeName?: string | null;
  hopNames?: string[];
  url: string;
  labels: {
    kinship: string;
    pathHeader: string;
    linkHeader: string;
  };
}): string {
  const years = formatBirthYear(opts.person);
  const head = years
    ? `${opts.person.givenName} · ${years}`
    : opts.person.givenName;
  const lines: string[] = [head];

  if (opts.relationLabel && opts.homeName) {
    lines.push(
      opts.labels.kinship
        .replace("{{rel}}", opts.relationLabel)
        .replace("{{home}}", opts.homeName),
    );
  }

  if (opts.hopNames && opts.hopNames.length > 1) {
    lines.push("", opts.labels.pathHeader, opts.hopNames.join(" → "));
  }

  lines.push("", opts.labels.linkHeader, opts.url);
  return lines.join("\n");
}
