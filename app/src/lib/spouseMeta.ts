import type { Person, Relationship } from "@db/schema";
import { formatBirthDate } from "@/lib/birthOrder";

export function findSpouseRel(
  rels: Relationship[],
  personA: number,
  personB: number,
): Relationship | undefined {
  return rels.find(
    (r) =>
      r.type === "spouse" &&
      ((r.fromPersonId === personA && r.toPersonId === personB) ||
        (r.fromPersonId === personB && r.toPersonId === personA)),
  );
}

export type SpouseDateParts = {
  marriageDay?: number | null;
  marriageMonth?: number | null;
  marriageYear?: number | null;
  divorceDay?: number | null;
  divorceMonth?: number | null;
  divorceYear?: number | null;
};

export function formatSpouseDates(
  rel: SpouseDateParts | undefined | null,
  t: (k: string, o?: Record<string, unknown>) => string,
): { marriage?: string; divorce?: string } {
  if (!rel) return {};

  const marriage = rel.marriageYear
    ? formatBirthDate(
        {
          birthDay: rel.marriageDay,
          birthMonth: rel.marriageMonth,
          birthYear: rel.marriageYear,
        },
        "ar-OM",
      ) ?? String(rel.marriageYear)
    : undefined;

  const divorce = rel.divorceYear
    ? formatBirthDate(
        {
          birthDay: rel.divorceDay,
          birthMonth: rel.divorceMonth,
          birthYear: rel.divorceYear,
        },
        "ar-OM",
      ) ?? String(rel.divorceYear)
    : undefined;

  return {
    ...(marriage ? { marriage: t("chart.marriedOn", { date: marriage }) } : {}),
    ...(divorce ? { divorce: t("chart.divorcedOn", { date: divorce }) } : {}),
  };
}

/** ترتيب الزوجات: الأولى يميناً (الأقدم زواجاً) */
export function sortSpouses(
  spouses: Person[],
  rels: Relationship[],
  anchorId: number,
): Person[] {
  return [...spouses].sort((a, b) => {
    const relA = findSpouseRel(rels, anchorId, a.id);
    const relB = findSpouseRel(rels, anchorId, b.id);
    const keyA = relA?.marriageYear ?? relA?.createdAt?.valueOf?.() ?? a.id;
    const keyB = relB?.marriageYear ?? relB?.createdAt?.valueOf?.() ?? b.id;
    return Number(keyA) - Number(keyB);
  });
}

/** مراكز الأعمدة في RTL: الزوجة الأولى يميناً */
export function rtlColumnCenters(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (1 - (i + 0.5) / count) * 100);
}
