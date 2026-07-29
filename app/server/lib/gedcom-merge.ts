/** علامة ثابتة في notes لربط فرد GEDCOM عند إعادة الاستيراد */
const GED_TAG_RE = /\[\[ged:([^\]]+)\]\]/i;

export function extractGedcomKey(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(GED_TAG_RE);
  return m?.[1]?.trim() || null;
}

export function embedGedcomKey(
  notes: string | null | undefined,
  key: string,
): string {
  const tag = `[[ged:${key}]]`;
  const raw = (notes ?? "").trim();
  if (!raw) return tag;
  if (GED_TAG_RE.test(raw)) {
    return raw.replace(GED_TAG_RE, tag);
  }
  return `${tag}\n${raw}`;
}

/** بصمة تقريبية لدمج الاستيراد بدون مفتاح GEDCOM */
export function personImportFingerprint(p: {
  givenName: string;
  fatherName?: string | null;
  gender: string;
  birthYear?: number | null;
  birthPlace?: string | null;
}): string {
  return [
    p.givenName.trim().toLowerCase(),
    (p.fatherName ?? "").trim().toLowerCase(),
    p.gender,
    p.birthYear ?? "",
    (p.birthPlace ?? "").trim().toLowerCase(),
  ].join("|");
}
