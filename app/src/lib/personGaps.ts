import type { Person, Relationship } from "@db/tables";
import { buildChildrenOf, buildSpousesOf, getParents } from "@/lib/familyGraph";

export type PersonGapKind =
  | "noPhoto"
  | "noBirthYear"
  | "missingFather"
  | "missingMother"
  | "missingBothParents"
  | "childNoSpouseLink";

export type PersonGap = {
  kind: PersonGapKind;
};

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

  return gaps;
}
