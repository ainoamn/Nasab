import type { Person, Relationship } from "@db/tables";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\r?\n/g, " ").trim();
}

function sex(gender: string): string {
  return gender === "female" ? "F" : "M";
}

function dateLine(
  day?: number | null,
  month?: number | null,
  year?: number | null,
): string | null {
  if (!year) return null;
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  if (day && month) return `${day} ${months[month - 1]} ${year}`;
  if (month) return `${months[month - 1]} ${year}`;
  return String(year);
}

/**
 * تصدير GEDCOM 5.5.1 مبسّط — متوافق مع معظم برامج الأنساب.
 */
export function buildGedcom(
  treeName: string,
  people: Person[],
  rels: Relationship[],
): string {
  const lines: string[] = [
    "0 HEAD",
    "1 SOUR Nasab",
    "2 NAME نَسَب",
    "2 VERS 1.0",
    "1 DEST ANY",
    "1 GEDC",
    "2 VERS 5.5.1",
    "2 FORM LINEAGE-LINKED",
    "1 CHAR UTF-8",
    `1 FILE ${esc(treeName) || "nasab"}.ged`,
  ];

  const idMap = new Map<number, string>();
  people.forEach((p, i) => idMap.set(p.id, `I${i + 1}`));

  for (const p of people) {
    const xref = idMap.get(p.id)!;
    const name = [p.givenName, p.fatherName].filter(Boolean).join(" /") + "/";
    lines.push(`0 @${xref}@ INDI`);
    lines.push(`1 NAME ${esc(name)}`);
    lines.push(`1 SEX ${sex(p.gender)}`);
    if (p.kunya) lines.push(`1 ALIA ${esc(p.kunya)}`);
    const b = dateLine(p.birthDay, p.birthMonth, p.birthYear);
    if (b || p.birthPlace) {
      lines.push("1 BIRT");
      if (b) lines.push(`2 DATE ${b}`);
      if (p.birthPlace) lines.push(`2 PLAC ${esc(p.birthPlace)}`);
    }
    if (!p.isLiving) {
      const d = dateLine(p.deathDay, p.deathMonth, p.deathYear);
      lines.push("1 DEAT");
      if (d) lines.push(`2 DATE ${d}`);
      if (p.deathPlace) lines.push(`2 PLAC ${esc(p.deathPlace)}`);
    }
    if (p.notes) {
      lines.push(`1 NOTE ${esc(p.notes)}`);
    }
    if (p.twinGroupId != null) {
      const mates = people.filter(
        (o) => o.twinGroupId === p.twinGroupId && o.id !== p.id,
      );
      if (mates.length > 0) {
        lines.push(`1 _TGID ${p.twinGroupId}`);
        for (const mate of mates) {
          const mateXref = idMap.get(mate.id);
          if (!mateXref) continue;
          lines.push(`1 ASSO @${mateXref}@`);
          lines.push(`2 RELA twin`);
        }
      }
    }
  }

  // عائلات: نجمع الأب+الأم ثم الأبناء
  const spouses = rels.filter((r) => r.type === "spouse");
  const parents = rels.filter((r) => r.type === "parent");
  const usedKids = new Set<number>();
  let famN = 0;

  const emitFamily = (
    husbandId: number | null,
    wifeId: number | null,
    childIds: number[],
  ) => {
    famN += 1;
    const fam = `F${famN}`;
    lines.push(`0 @${fam}@ FAM`);
    if (husbandId != null && idMap.has(husbandId)) {
      lines.push(`1 HUSB @${idMap.get(husbandId)}@`);
    }
    if (wifeId != null && idMap.has(wifeId)) {
      lines.push(`1 WIFE @${idMap.get(wifeId)}@`);
    }
    for (const cid of childIds) {
      if (!idMap.has(cid)) continue;
      lines.push(`1 CHIL @${idMap.get(cid)}@`);
      usedKids.add(cid);
    }
  };

  const byId = new Map(people.map((p) => [p.id, p]));
  const spousePairs = new Set<string>();

  for (const r of spouses) {
    const a = byId.get(r.fromPersonId);
    const b = byId.get(r.toPersonId);
    if (!a || !b) continue;
    const husband = a.gender === "male" ? a.id : b.gender === "male" ? b.id : a.id;
    const wife = a.gender === "female" ? a.id : b.gender === "female" ? b.id : b.id;
    const key = `${Math.min(husband, wife)}-${Math.max(husband, wife)}`;
    if (spousePairs.has(key)) continue;
    spousePairs.add(key);

    const kids = parents
      .filter((p) => p.fromPersonId === husband || p.fromPersonId === wife)
      .map((p) => p.toPersonId)
      .filter((cid, i, arr) => arr.indexOf(cid) === i)
      .filter((cid) => {
        const links = parents.filter((p) => p.toPersonId === cid);
        const fromH = links.some((l) => l.fromPersonId === husband);
        const fromW = links.some((l) => l.fromPersonId === wife);
        return fromH || fromW;
      });

    emitFamily(husband, wife, kids);
  }

  // أبناء بدون عائلة زوجية مكتملة
  const orphans = parents
    .map((p) => p.toPersonId)
    .filter((id, i, arr) => arr.indexOf(id) === i && !usedKids.has(id));

  for (const cid of orphans) {
    const links = parents.filter((p) => p.toPersonId === cid);
    let husbandId: number | null = null;
    let wifeId: number | null = null;
    for (const l of links) {
      const parent = byId.get(l.fromPersonId);
      if (!parent) continue;
      if (parent.gender === "female") wifeId = parent.id;
      else husbandId = parent.id;
    }
    emitFamily(husbandId, wifeId, [cid]);
  }

  lines.push("0 TRLR");
  return lines.join("\n") + "\n";
}

export function downloadGedcom(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ged") ? filename : `${filename}.ged`;
  a.click();
  URL.revokeObjectURL(url);
}
