import type { Person, Relationship } from "@db/tables";
import { buildChildrenOf, buildSpousesOf, getParents } from "@/lib/familyGraph";
import { isFullSibling } from "@/lib/twins";

export type PersonGapKind =
  | "noPhoto"
  | "noBirthYear"
  | "missingFather"
  | "missingMother"
  | "missingBothParents"
  | "childNoSpouseLink"
  | "possibleTwin";

export type PersonGap = {
  kind: PersonGapKind;
};

export function sameBirthHint(a: Person, b: Person): boolean {
  if (a.birthYear == null || b.birthYear == null) return false;
  if (a.birthYear !== b.birthYear) return false;
  if (a.birthMonth != null && b.birthMonth != null && a.birthMonth !== b.birthMonth) {
    return false;
  }
  if (a.birthDay != null && b.birthDay != null && a.birthDay !== b.birthDay) {
    return false;
  }
  return true;
}

/** نواقص ملف شخص واحد — للوحة التفاصيل */
export function findPersonGaps(
  person: Person,
  people: Person[],
  rels: Relationship[],
): PersonGap[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const childrenOf = buildChildrenOf(rels);
  const spousesOf = buildSpousesOf(rels);
  const { fatherId, motherId } = getParents(person.id, rels, byId);
  const hasKids = (childrenOf.get(person.id) ?? []).length > 0;
  const gaps: PersonGap[] = [];

  if (!person.photoUrl) gaps.push({ kind: "noPhoto" });
  if (person.birthYear == null) gaps.push({ kind: "noBirthYear" });

  if (!fatherId && !motherId) {
    gaps.push({ kind: "missingBothParents" });
  } else if (!fatherId) {
    gaps.push({ kind: "missingFather" });
  } else if (!motherId) {
    gaps.push({ kind: "missingMother" });
  }

  if (
    hasKids &&
    (spousesOf.get(person.id) ?? []).length === 0 &&
    person.gender === "male"
  ) {
    gaps.push({ kind: "childNoSpouseLink" });
  }

  if (person.twinGroupId == null && person.birthYear != null) {
    const twinHint = people.some(
      (other) =>
        other.id !== person.id &&
        other.twinGroupId == null &&
        sameBirthHint(person, other) &&
        isFullSibling(person.id, other.id, rels, byId),
    );
    if (twinHint) gaps.push({ kind: "possibleTwin" });
  }

  return gaps;
}

/** خريطة نواقص لكل الأفراد — لنقاط البحث على المخطط */
export function buildPersonGapsMap(
  people: Person[],
  rels: Relationship[],
  opts?: { skipNoPhoto?: boolean },
): Map<number, PersonGap[]> {
  const map = new Map<number, PersonGap[]>();
  for (const p of people) {
    let gaps = findPersonGaps(p, people, rels);
    if (opts?.skipNoPhoto) {
      gaps = gaps.filter((g) => g.kind !== "noPhoto");
    }
    if (gaps.length > 0) map.set(p.id, gaps);
  }
  return map;
}
