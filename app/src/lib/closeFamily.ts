import type { Person, Relationship } from "@db/tables";
import {
  buildChildrenOf,
  buildSpousesOf,
  getParents,
} from "@/lib/familyGraph";

/**
 * العائلة القريبة: المحور + الأب/الأم + الإخوة + الزوج/ة + الأبناء فقط
 * (بدون سلسلة الأسلاف الكاملة أو الأحفاد العميقة).
 */
export function collectCloseFamily(
  focusId: number,
  people: Person[],
  rels: Relationship[],
): { people: Person[]; rels: Relationship[] } {
  const byId = new Map(people.map((p) => [p.id, p]));
  if (!byId.has(focusId)) return { people: [], rels: [] };

  const included = new Set<number>([focusId]);
  const childrenOf = buildChildrenOf(rels);
  const spousesOf = buildSpousesOf(rels);

  const { fatherId, motherId } = getParents(focusId, rels, byId);
  for (const pid of [fatherId, motherId]) {
    if (pid != null && byId.has(pid)) included.add(pid);
  }

  // إخوة من نفس الأب أو الأم
  for (const pid of [fatherId, motherId]) {
    if (pid == null) continue;
    for (const sib of childrenOf.get(pid) ?? []) {
      if (byId.has(sib)) included.add(sib);
    }
  }

  // زوج/ة المحور
  for (const sid of spousesOf.get(focusId) ?? []) {
    if (byId.has(sid)) included.add(sid);
  }

  // أبناء المحور (+ أزواجهم للسياق)
  for (const kid of childrenOf.get(focusId) ?? []) {
    if (!byId.has(kid)) continue;
    included.add(kid);
    for (const sid of spousesOf.get(kid) ?? []) {
      if (byId.has(sid)) included.add(sid);
    }
  }

  // إن كان المحور أنثى/ذكر وله أبناء مسجّلون عبر الزوج فقط
  for (const sid of spousesOf.get(focusId) ?? []) {
    for (const kid of childrenOf.get(sid) ?? []) {
      if (!byId.has(kid)) continue;
      const { fatherId: f, motherId: m } = getParents(kid, rels, byId);
      if (f === focusId || m === focusId || f === sid || m === sid) {
        included.add(kid);
      }
    }
  }

  const filteredPeople = people.filter((p) => included.has(p.id));
  const filteredRels = rels.filter(
    (r) => included.has(r.fromPersonId) && included.has(r.toPersonId),
  );
  return { people: filteredPeople, rels: filteredRels };
}
