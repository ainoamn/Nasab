import type { Person, Relationship } from "@db/schema";
import { getParents } from "@/lib/familyGraph";
import { comparePeopleByBirth } from "@/lib/birthOrder";

export function getTwinGroupMembers(
  person: Person,
  people: Person[],
): Person[] {
  if (person.twinGroupId == null) return [];
  return people
    .filter((p) => p.twinGroupId === person.twinGroupId && p.id !== person.id)
    .sort(comparePeopleByBirth);
}

/** توأم فعلي: مجموعة فيها شخصان على الأقل */
export function isTwin(person: Person, people?: Person[]): boolean {
  if (person.twinGroupId == null) return false;
  if (!people) return true;
  return twinGroupSize(person, people) >= 2;
}

export function twinGroupSize(person: Person, people: Person[]): number {
  if (person.twinGroupId == null) return 0;
  return people.filter((p) => p.twinGroupId === person.twinGroupId).length;
}

/**
 * إخوة أشقاء فقط: نفس الأب ونفس الأم معاً.
 * إن نقص أحد الأبوين لدى أي طرف — لا يُعرض كمرشح توأم.
 */
export function isFullSibling(
  personId: number,
  otherId: number,
  rels: Relationship[],
  byId: Map<number, Person>,
): boolean {
  if (personId === otherId) return false;
  const a = getParents(personId, rels, byId);
  const b = getParents(otherId, rels, byId);
  if (
    a.fatherId == null ||
    a.motherId == null ||
    b.fatherId == null ||
    b.motherId == null
  ) {
    return false;
  }
  return a.fatherId === b.fatherId && a.motherId === b.motherId;
}

/** إخوة أشقاء يمكن ربطهم كتوأم */
export function twinCandidateSiblings(
  person: Person,
  _siblings: Person[],
  rels: Relationship[],
  people: Person[],
): Person[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const myParents = getParents(person.id, rels, byId);
  if (myParents.fatherId == null || myParents.motherId == null) return [];

  return people
    .filter((s) => {
      if (s.id === person.id) return false;
      if (s.twinGroupId != null && s.twinGroupId === person.twinGroupId) {
        return false;
      }
      return isFullSibling(person.id, s.id, rels, byId);
    })
    .sort(comparePeopleByBirth);
}

/** قائمة أشقاء للعرض في أداة التوأم (نفس الأبوين) */
export function fullSiblingsOf(
  person: Person,
  rels: Relationship[],
  people: Person[],
): Person[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  return people
    .filter((s) => isFullSibling(person.id, s.id, rels, byId))
    .sort(comparePeopleByBirth);
}

/** ترتيب التوأم داخل المجموعة (١ = الأكبر) */
export function twinOrderInGroup(
  person: Person,
  people: Person[],
): number | null {
  if (person.twinGroupId == null) return null;
  const group = people
    .filter((p) => p.twinGroupId === person.twinGroupId)
    .sort(comparePeopleByBirth);
  if (group.length < 2) return null;
  const idx = group.findIndex((p) => p.id === person.id);
  return idx >= 0 ? idx + 1 : null;
}

export type TwinKind = "identical" | "fraternal" | "mixed";

/**
 * نوع التوأم حسب جنس أفراد المجموعة (استنتاج واجهة فقط):
 * أجناس مختلفة → مختلط؛ نفس الجنس → متطابق (لا يثبت DNA).
 */
export function twinKindForGroup(
  person: Person,
  people: Person[],
): TwinKind | null {
  if (person.twinGroupId == null) return null;
  const group = people.filter((p) => p.twinGroupId === person.twinGroupId);
  if (group.length < 2) return null;
  const genders = new Set(group.map((p) => p.gender));
  if (genders.size > 1) return "mixed";
  return "identical";
}

/** تسمية مختصرة للشارة: ت١ / ت٢ أو T1 / T2 */
export function twinMarkLabel(
  person: Person,
  people: Person[],
  twinWord = "ت",
): string | null {
  const order = twinOrderInGroup(person, people);
  const size = twinGroupSize(person, people);
  if (!order || size < 2) return null;
  return `${twinWord}${order}`;
}

/** حرف علامة التوأم حسب لغة الواجهة */
export function twinMarkWord(lang?: string | null): string {
  return lang?.toLowerCase().startsWith("en") ? "T" : "ت";
}
