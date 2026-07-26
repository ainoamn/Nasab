import type { Person, Relationship } from "@db/tables";
import { buildChildrenOf, buildSpousesOf, getParents } from "@/lib/familyGraph";

export type CompletenessBreakdown = {
  score: number;
  peopleCount: number;
  withBirthYear: number;
  withPhoto: number;
  withParent: number;
  parentsOfKidsWithSpouse: number;
  parentsOfKidsTotal: number;
};

/** نسبة اكتمال الشجرة — مؤشر أوضح من مجرد العدد */
export function computeTreeCompleteness(
  people: Person[],
  rels: Relationship[],
): CompletenessBreakdown {
  const byId = new Map(people.map((p) => [p.id, p]));
  const childrenOf = buildChildrenOf(rels);
  const spousesOf = buildSpousesOf(rels);

  let withBirthYear = 0;
  let withPhoto = 0;
  let withParent = 0;
  let parentsOfKidsWithSpouse = 0;
  let parentsOfKidsTotal = 0;

  for (const p of people) {
    if (p.birthYear != null) withBirthYear += 1;
    if (p.photoUrl) withPhoto += 1;
    const { fatherId, motherId } = getParents(p.id, rels, byId);
    if (fatherId || motherId) withParent += 1;

    const kids = childrenOf.get(p.id) ?? [];
    if (kids.length > 0 && p.gender === "male") {
      parentsOfKidsTotal += 1;
      if ((spousesOf.get(p.id) ?? []).length > 0) parentsOfKidsWithSpouse += 1;
    }
  }

  const n = people.length;
  if (n === 0) {
    return {
      score: 0,
      peopleCount: 0,
      withBirthYear: 0,
      withPhoto: 0,
      withParent: 0,
      parentsOfKidsWithSpouse: 0,
      parentsOfKidsTotal: 0,
    };
  }

  // أوزان: ميلاد 30٪، صورة 20٪، أب/أم 30٪، زوجية لمن لديهم أبناء 20٪
  const birthPct = withBirthYear / n;
  const photoPct = withPhoto / n;
  const parentPct = withParent / n;
  const spousePct =
    parentsOfKidsTotal > 0
      ? parentsOfKidsWithSpouse / parentsOfKidsTotal
      : 1;

  const score = Math.round(
    100 * (0.3 * birthPct + 0.2 * photoPct + 0.3 * parentPct + 0.2 * spousePct),
  );

  return {
    score,
    peopleCount: n,
    withBirthYear,
    withPhoto,
    withParent,
    parentsOfKidsWithSpouse,
    parentsOfKidsTotal,
  };
}
