import type { Person, Relationship } from "@db/tables";
import { buildChildrenOf, buildSpousesOf, getParents } from "@/lib/familyGraph";

export type RelationKey =
  | "self"
  | "father"
  | "mother"
  | "spouse"
  | "son"
  | "daughter"
  | "brother"
  | "sister"
  | "grandfather"
  | "grandmother"
  | "grandson"
  | "granddaughter"
  | "relative";

/** تسمية القرابة بالنسبة لشخص محوري (للقائمة بأسلوب مواقع النسب) */
export function relationToFocus(
  focusId: number,
  personId: number,
  people: Person[],
  rels: Relationship[],
): RelationKey {
  if (focusId === personId) return "self";
  const byId = new Map(people.map((p) => [p.id, p]));
  const person = byId.get(personId);
  if (!person) return "relative";

  const { fatherId, motherId } = getParents(focusId, rels, byId);
  if (personId === fatherId) return "father";
  if (personId === motherId) return "mother";

  const spousesOf = buildSpousesOf(rels);
  if ((spousesOf.get(focusId) ?? []).includes(personId)) return "spouse";

  const childrenOf = buildChildrenOf(rels);
  const kids = childrenOf.get(focusId) ?? [];
  if (kids.includes(personId)) {
    return person.gender === "female" ? "daughter" : "son";
  }

  // إخوة: نفس الأب أو الأم
  const siblingParentIds = [fatherId, motherId].filter(
    (id): id is number => id != null,
  );
  for (const pid of siblingParentIds) {
    if ((childrenOf.get(pid) ?? []).includes(personId) && personId !== focusId) {
      return person.gender === "female" ? "sister" : "brother";
    }
  }

  // أجداد
  if (fatherId) {
    const fp = getParents(fatherId, rels, byId);
    if (personId === fp.fatherId) return "grandfather";
    if (personId === fp.motherId) return "grandmother";
  }
  if (motherId) {
    const mp = getParents(motherId, rels, byId);
    if (personId === mp.fatherId) return "grandfather";
    if (personId === mp.motherId) return "grandmother";
  }

  // أحفاد (أبناء الأبناء)
  for (const kidId of kids) {
    if ((childrenOf.get(kidId) ?? []).includes(personId)) {
      return person.gender === "female" ? "granddaughter" : "grandson";
    }
  }

  return "relative";
}
