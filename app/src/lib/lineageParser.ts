/** تحليل النسب العربي: "بنت سالم بن سلمان الرواحي" */

export type LineageSegment = {
  givenName: string;
  /** بن / بنت / ابن / etc. */
  prefix?: string;
};

export type ParsedLineage = {
  segments: LineageSegment[];
  /** الاسم الكامل للأب المباشر كنص */
  directFatherLine: string | null;
  /** اللقب/القبيلة من آخر جزء إن وُجد */
  clanHint: string | null;
};

const BIN_RE =
  /^(?:بن|بنت|ابن|ابنة|إبن|إبنة|ابنه|ابنت|بinte?)\s+/i;

/** يفكّك سلسلة النسب إلى أسماء */
export function parseLineageChain(text: string): ParsedLineage {
  const raw = text.trim();
  if (!raw) {
    return { segments: [], directFatherLine: null, clanHint: null };
  }

  const parts = raw
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const segments: LineageSegment[] = [];
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];
    const binMatch = part.match(/^(بن|بنت|ابن|ابنة|إبن|إبنة)$/i);
    if (binMatch && i + 1 < parts.length) {
      segments.push({
        prefix: binMatch[1],
        givenName: parts[i + 1],
      });
      i += 2;
    } else if (BIN_RE.test(part)) {
      segments.push({
        prefix: part.match(BIN_RE)![0].trim(),
        givenName: part.replace(BIN_RE, "").trim(),
      });
      i += 1;
    } else {
      segments.push({ givenName: part });
      i += 1;
    }
  }

  const directFatherLine =
    segments.length > 0
      ? segments.map((s) => s.givenName).join(" ")
      : null;

  const last = segments.at(-1);
  const clanHint =
    segments.length >= 2 && last && /^(ال)?[\u0600-\u06FF]+$/i.test(last.givenName)
      ? last.givenName
      : null;

  return { segments, directFatherLine, clanHint };
}

/** يبني نص النسب من سلسلة أسماء */
export function buildFatherNameLine(names: string[], gender: "male" | "female"): string {
  if (names.length === 0) return "";
  const joiner = gender === "female" ? "بنت" : "بن";
  return names
    .map((name, idx) => (idx === 0 ? `${joiner} ${name}` : `بن ${name}`))
    .join(" ");
}

/** مطابقة تقريبية بين نصين عربيين */
export function normalizeArabicName(s: string): string {
  return s
    .trim()
    .replace(/[\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/[ى]/g, "ي")
    .replace(/[ة]/g, "ه")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function namesMatch(a: string, b: string): boolean {
  return normalizeArabicName(a) === normalizeArabicName(b);
}

/** هل يطابق الشخص سلسلة النسب؟ */
export function personMatchesLineage(
  givenName: string,
  fatherName: string | null | undefined,
  targetGiven: string,
  targetLineage: string,
): boolean {
  if (!namesMatch(givenName, targetGiven)) return false;
  if (!fatherName?.trim() || !targetLineage.trim()) return false;
  const parsed = parseLineageChain(fatherName);
  const targetParsed = parseLineageChain(targetLineage);
  if (parsed.segments.length === 0 || targetParsed.segments.length === 0) {
    return normalizeArabicName(fatherName).includes(
      normalizeArabicName(targetLineage),
    );
  }
  const minLen = Math.min(parsed.segments.length, targetParsed.segments.length);
  for (let i = 0; i < minLen; i++) {
    if (!namesMatch(parsed.segments[i].givenName, targetParsed.segments[i].givenName)) {
      return false;
    }
  }
  return true;
}

/** سلسلة الآباء المطلوبة لإنشاء فرع: [أب مباشر، جد، ...] */
export function lineageAncestorsToCreate(
  fatherNameLine: string,
  gender: "male" | "female",
): Array<{ givenName: string; gender: "male" | "female"; fatherNameLine: string }> {
  const parsed = parseLineageChain(fatherNameLine);
  if (parsed.segments.length === 0) return [];

  const ancestors: Array<{
    givenName: string;
    gender: "male" | "female";
    fatherNameLine: string;
  }> = [];

  for (let i = 0; i < parsed.segments.length; i++) {
    const seg = parsed.segments[i];
    const rest = parsed.segments.slice(i + 1).map((s) => s.givenName);
    ancestors.push({
      givenName: seg.givenName,
      gender: "male",
      fatherNameLine: rest.length > 0 ? buildFatherNameLine(rest, "male") : "",
    });
  }

  return ancestors;
}
