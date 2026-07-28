import type { Person, Relationship } from "@db/schema";
import {
  buildChildrenOf,
  buildSpousesOf,
  getParents,
  oppositeSpouses,
} from "@/lib/familyGraph";

/** الأب إن وُجد في مجموعة الطباعة، وإلا الأم */
export function preferredParentId(
  childId: number,
  rels: Relationship[],
  byId: Map<number, Person>,
): number | null {
  const { fatherId, motherId } = getParents(childId, rels, byId);
  if (fatherId != null && byId.has(fatherId)) return fatherId;
  if (motherId != null && byId.has(motherId)) return motherId;
  return fatherId ?? motherId;
}

/** ملاحظة زوجية للعرض بجانب الاسم */
export type SpouseNoteLabels = { wife: string; husband: string };

const DEFAULT_SPOUSE_LABELS: SpouseNoteLabels = {
  wife: "زوجة",
  husband: "زوج",
};

export function spouseNoteLabel(
  spouse: Person,
  labels: SpouseNoteLabels = DEFAULT_SPOUSE_LABELS,
): string {
  const role = spouse.gender === "female" ? labels.wife : labels.husband;
  return `${role} ${spouse.givenName}`;
}

/**
 * خريطة: شخص ← ملاحظات أزواجه الظاهرين في المجموعة
 * (زوجة آسية / زوج أسعد)
 */
export function buildSpouseNotesMap(
  people: Person[],
  rels: Relationship[],
  labels: SpouseNoteLabels = DEFAULT_SPOUSE_LABELS,
): Map<number, string[]> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const spousesOf = buildSpousesOf(rels);
  const map = new Map<number, string[]>();
  const ids = new Set(people.map((p) => p.id));

  const add = (personId: number, spouse: Person) => {
    if (!ids.has(spouse.id)) return;
    const note = spouseNoteLabel(spouse, labels);
    const list = map.get(personId) ?? [];
    if (!list.includes(note)) list.push(note);
    map.set(personId, list);
  };

  for (const p of people) {
    for (const s of oppositeSpouses(p, spousesOf, byId)) {
      add(p.id, s);
      add(s.id, p);
    }
  }

  const childrenOf = buildChildrenOf(rels);
  for (const p of people) {
    for (const kid of childrenOf.get(p.id) ?? []) {
      const { fatherId, motherId } = getParents(kid, rels, byId);
      if (fatherId == null || motherId == null) continue;
      if (!ids.has(fatherId) || !ids.has(motherId)) continue;
      const father = byId.get(fatherId);
      const mother = byId.get(motherId);
      if (father && mother) {
        add(fatherId, mother);
        add(motherId, father);
      }
    }
  }

  return map;
}

export type MarriageLink = { fromId: number; toId: number };

/** أزواج ظاهرون معاً في المجموعة — لرسم خط زواج خفيف */
export function collectMarriageLinks(
  people: Person[],
  rels: Relationship[],
): MarriageLink[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const spousesOf = buildSpousesOf(rels);
  const ids = new Set(people.map((p) => p.id));
  const seen = new Set<string>();
  const out: MarriageLink[] = [];

  const add = (a: number, b: number) => {
    if (a === b || !ids.has(a) || !ids.has(b)) return;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const key = `${lo}:${hi}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ fromId: lo, toId: hi });
  };

  for (const p of people) {
    for (const s of oppositeSpouses(p, spousesOf, byId)) {
      add(p.id, s.id);
    }
  }

  const childrenOf = buildChildrenOf(rels);
  for (const p of people) {
    for (const kid of childrenOf.get(p.id) ?? []) {
      const { fatherId, motherId } = getParents(kid, rels, byId);
      if (fatherId != null && motherId != null) add(fatherId, motherId);
    }
  }

  return out;
}

/** نسل الدم من الجذر عبر علاقات الأبوة */
export function markBloodlineFromRoot(
  rootPersonId: number,
  people: Person[],
  rels: Relationship[],
): Set<number> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const childrenOf = buildChildrenOf(rels);
  const blood = new Set<number>();
  if (!byId.has(rootPersonId)) return blood;
  blood.add(rootPersonId);
  const q = [rootPersonId];
  while (q.length > 0) {
    const id = q.shift()!;
    for (const kid of childrenOf.get(id) ?? []) {
      if (!byId.has(kid) || blood.has(kid)) continue;
      blood.add(kid);
      q.push(kid);
    }
  }
  // أبناء مسجّلون على الزوج/الزوجة ضمن الدم
  const spousesOf = buildSpousesOf(rels);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...blood]) {
      const person = byId.get(id);
      if (!person) continue;
      for (const sp of oppositeSpouses(person, spousesOf, byId)) {
        for (const kid of childrenOf.get(sp.id) ?? []) {
          if (!byId.has(kid) || blood.has(kid)) continue;
          const pref = preferredParentId(kid, rels, byId);
          if (pref === id || pref === sp.id) {
            // ابن مشترك أو تحت أحد الطرفين وهو دم
            const { fatherId, motherId } = getParents(kid, rels, byId);
            if (fatherId === id || motherId === id || fatherId === sp.id || motherId === sp.id) {
              if (pref != null && blood.has(pref)) {
                blood.add(kid);
                grew = true;
                q.push(kid);
              }
            }
          }
        }
      }
      for (const kid of childrenOf.get(id) ?? []) {
        if (!byId.has(kid) || blood.has(kid)) continue;
        blood.add(kid);
        grew = true;
      }
    }
  }
  return blood;
}

/** هل الزوج من خارج خط النسب (قمر صناعي)؟ */
export function isInLawSpouse(
  personId: number,
  spouseId: number,
  bloodline: Set<number>,
): boolean {
  return bloodline.has(personId) && !bloodline.has(spouseId);
}
