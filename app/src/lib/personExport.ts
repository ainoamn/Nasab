import type { Person, Relationship } from "@db/tables";
import { getParents } from "@/lib/familyGraph";
import { formatBirthYear } from "@/lib/printData";

function vcardEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(
  y?: number | null,
  m?: number | null,
  d?: number | null,
): string | null {
  if (!y) return null;
  return `${y}${pad(m ?? 1)}${pad(d ?? 1)}`;
}

/** بطاقة vCard لجهة اتصال الهاتف من ملف شخص */
export function buildPersonVCard(
  person: Person,
  opts?: { url?: string; treeName?: string },
): string {
  const fn = [person.givenName, person.fatherName].filter(Boolean).join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${vcardEscape(fn)}`,
    `N:${vcardEscape(person.fatherName ?? "")};${vcardEscape(person.givenName)};;;`,
  ];
  if (person.kunya) lines.push(`NICKNAME:${vcardEscape(person.kunya)}`);
  if (person.gender === "male") lines.push("GENDER:M");
  if (person.gender === "female") lines.push("GENDER:F");
  const bday = ymd(person.birthYear, person.birthMonth, person.birthDay);
  if (bday) lines.push(`BDAY:${bday}`);
  if (person.birthPlace) {
    lines.push(`ADR;TYPE=home:;;${vcardEscape(person.birthPlace)};;;;`);
  }
  if (person.notes) lines.push(`NOTE:${vcardEscape(person.notes)}`);
  if (opts?.url) lines.push(`URL:${opts.url}`);
  if (opts?.treeName) {
    lines.push(`ORG:${vcardEscape(opts.treeName)}`);
  }
  const years = formatBirthYear(person);
  if (years) lines.push(`X-NASAB-YEARS:${vcardEscape(years)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

/** لقطة JSON قابلة للاستيراد لاحقاً لملف شخص + أبويه */
export function buildPersonExportJson(
  person: Person,
  people: Person[],
  rels: Relationship[],
  opts?: { url?: string; treeName?: string },
): string {
  const byId = new Map(people.map((p) => [p.id, p]));
  const { fatherId, motherId } = getParents(person.id, rels, byId);
  const father = fatherId != null ? byId.get(fatherId) : null;
  const mother = motherId != null ? byId.get(motherId) : null;
  const payload = {
    format: "nasab-person-v1",
    exportedAt: new Date().toISOString(),
    treeName: opts?.treeName ?? null,
    url: opts?.url ?? null,
    person: {
      id: person.id,
      givenName: person.givenName,
      fatherName: person.fatherName,
      kunya: person.kunya,
      laqab: person.laqab,
      clan: person.clan,
      gender: person.gender,
      birthDay: person.birthDay,
      birthMonth: person.birthMonth,
      birthYear: person.birthYear,
      birthPlace: person.birthPlace,
      deathDay: person.deathDay,
      deathMonth: person.deathMonth,
      deathYear: person.deathYear,
      deathPlace: person.deathPlace,
      isLiving: person.isLiving,
      notes: person.notes,
      years: formatBirthYear(person),
    },
    parents: {
      father: father
        ? { id: father.id, givenName: father.givenName, birthYear: father.birthYear }
        : null,
      mother: mother
        ? { id: mother.id, givenName: mother.givenName, birthYear: mother.birthYear }
        : null,
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadPersonVCard(
  person: Person,
  opts?: { url?: string; treeName?: string },
): void {
  const safe = person.givenName.replace(/[^\w\u0600-\u06FF-]+/g, "_") || "person";
  downloadTextFile(
    `nasab-${safe}.vcf`,
    buildPersonVCard(person, opts),
    "text/vcard;charset=utf-8",
  );
}

export function downloadPersonJson(
  person: Person,
  people: Person[],
  rels: Relationship[],
  opts?: { url?: string; treeName?: string },
): void {
  const safe = person.givenName.replace(/[^\w\u0600-\u06FF-]+/g, "_") || "person";
  downloadTextFile(
    `nasab-${safe}.json`,
    buildPersonExportJson(person, people, rels, opts),
    "application/json;charset=utf-8",
  );
}
