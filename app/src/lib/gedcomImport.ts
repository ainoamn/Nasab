export type GedcomPersonDraft = {
  /** مفتاح GEDCOM مثل I1 */
  key: string;
  givenName: string;
  fatherName?: string | null;
  gender: "male" | "female";
  birthYear?: number | null;
  birthMonth?: number | null;
  birthDay?: number | null;
  birthPlace?: string | null;
  deathYear?: number | null;
  deathMonth?: number | null;
  deathDay?: number | null;
  deathPlace?: string | null;
  isLiving: boolean;
  kunya?: string | null;
  notes?: string | null;
};

export type GedcomLinkDraft = {
  type: "parent" | "spouse";
  fromKey: string;
  toKey: string;
};

export type ParsedGedcom = {
  people: GedcomPersonDraft[];
  links: GedcomLinkDraft[];
};

const MONTHS: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function parseGedDate(raw: string | undefined): {
  day: number | null;
  month: number | null;
  year: number | null;
} {
  if (!raw) return { day: null, month: null, year: null };
  const cleaned = raw.replace(/^(ABT|EST|CAL|BEF|AFT|FROM|TO)\s+/i, "").trim();
  const parts = cleaned.split(/\s+/);
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;
  for (const p of parts) {
    const up = p.toUpperCase();
    if (MONTHS[up]) month = MONTHS[up];
    else if (/^\d{1,2}$/.test(p) && Number(p) <= 31) day = Number(p);
    else if (/^\d{3,4}$/.test(p)) year = Number(p);
  }
  return { day, month, year };
}

function parseName(raw: string): { givenName: string; fatherName: string | null } {
  // GEDCOM: Given /Surname/  أو Given /FatherName/
  const m = raw.match(/^(.*?)\s*\/(.*)\/\s*$/);
  if (m) {
    const given = m[1].trim() || m[2].trim() || "Unknown";
    const sur = m[2].trim();
    return {
      givenName: given.split(/\s+/)[0] || given,
      fatherName: sur || (given.includes(" ") ? given.split(/\s+/).slice(1).join(" ") : null),
    };
  }
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { givenName: "Unknown", fatherName: null };
  return {
    givenName: parts[0],
    fatherName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

function xref(v: string | undefined): string | null {
  if (!v) return null;
  const m = v.match(/@([^@]+)@/);
  return m ? m[1] : null;
}

/**
 * محلّل GEDCOM 5.5.1 مبسّط — أفراد + روابط أب/زوج من FAM.
 */
export function parseGedcom(text: string): ParsedGedcom {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\r$/, ""));

  type Rec = { tag: string; xref: string | null; fields: Array<{ level: number; tag: string; value: string }> };
  const records: Rec[] = [];
  let current: Rec | null = null;

  for (const line of lines) {
    const m = line.match(/^(\d+)\s+(?:@([^@]+)@\s+)?(\S+)(?:\s+(.*))?$/);
    if (!m) continue;
    const level = Number(m[1]);
    const id = m[2] ?? null;
    const tag = m[3];
    const value = (m[4] ?? "").trim();

    if (level === 0) {
      if (current) records.push(current);
      current = { tag, xref: id, fields: [] };
      continue;
    }
    if (!current) continue;
    current.fields.push({ level, tag, value });
  }
  if (current) records.push(current);

  const people: GedcomPersonDraft[] = [];
  const peopleKeys = new Set<string>();

  for (const rec of records) {
    if (rec.tag !== "INDI" || !rec.xref) continue;
    let nameRaw = "";
    let sex = "M";
    let kunya: string | null = null;
    let notes: string | null = null;
    let birthDate = "";
    let birthPlace: string | null = null;
    let deathDate = "";
    let deathPlace: string | null = null;
    let hasDeath = false;
    let ctx: "none" | "birt" | "deat" = "none";

    for (const f of rec.fields) {
      if (f.level === 1) {
        ctx = "none";
        if (f.tag === "NAME" && !nameRaw) nameRaw = f.value;
        else if (f.tag === "SEX") sex = f.value.toUpperCase().startsWith("F") ? "F" : "M";
        else if (f.tag === "ALIA" || f.tag === "NICK") kunya = f.value || kunya;
        else if (f.tag === "NOTE") notes = [notes, f.value].filter(Boolean).join("\n");
        else if (f.tag === "BIRT") ctx = "birt";
        else if (f.tag === "DEAT") {
          hasDeath = true;
          ctx = "deat";
        }
      } else if (f.level === 2) {
        if (ctx === "birt") {
          if (f.tag === "DATE") birthDate = f.value;
          if (f.tag === "PLAC") birthPlace = f.value;
        } else if (ctx === "deat") {
          if (f.tag === "DATE") deathDate = f.value;
          if (f.tag === "PLAC") deathPlace = f.value;
        }
      }
    }

    const { givenName, fatherName } = parseName(nameRaw || rec.xref);
    const b = parseGedDate(birthDate);
    const d = parseGedDate(deathDate);
    people.push({
      key: rec.xref,
      givenName,
      fatherName,
      gender: sex === "F" ? "female" : "male",
      birthYear: b.year,
      birthMonth: b.month,
      birthDay: b.day,
      birthPlace,
      deathYear: d.year,
      deathMonth: d.month,
      deathDay: d.day,
      deathPlace,
      isLiving: !hasDeath,
      kunya,
      notes,
    });
    peopleKeys.add(rec.xref);
  }

  const links: GedcomLinkDraft[] = [];
  const seen = new Set<string>();
  const addLink = (type: "parent" | "spouse", fromKey: string, toKey: string) => {
    if (!peopleKeys.has(fromKey) || !peopleKeys.has(toKey) || fromKey === toKey) return;
    const k = `${type}:${[fromKey, toKey].sort().join(">")}:${type === "parent" ? fromKey + ">" + toKey : ""}`;
    if (seen.has(k)) return;
    seen.add(k);
    links.push({ type, fromKey, toKey });
  };

  for (const rec of records) {
    if (rec.tag !== "FAM") continue;
    let husb: string | null = null;
    let wife: string | null = null;
    const children: string[] = [];
    for (const f of rec.fields) {
      if (f.level !== 1) continue;
      if (f.tag === "HUSB") husb = xref(f.value);
      else if (f.tag === "WIFE") wife = xref(f.value);
      else if (f.tag === "CHIL") {
        const c = xref(f.value);
        if (c) children.push(c);
      }
    }
    if (husb && wife) addLink("spouse", husb, wife);
    for (const c of children) {
      if (husb) addLink("parent", husb, c);
      if (wife) addLink("parent", wife, c);
    }
  }

  return { people, links };
}
