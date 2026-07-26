import { assignGenerationsStable } from "@/lib/printData";
import type { Person, Relationship } from "@db/tables";

/**
 * يقتصر المخطط على أول N أجيال من أعلى جذر (أو من جذر محدد).
 */
export function limitPeopleByGenerations(
  people: Person[],
  rels: Relationship[],
  maxGenerations: number,
  rootPersonId?: number | null,
): { people: Person[]; rels: Relationship[] } {
  if (people.length === 0 || maxGenerations <= 0) {
    return { people, rels };
  }
  if (maxGenerations >= 99) return { people, rels };

  const levels = assignGenerationsStable(people, rels);
  const values = [...levels.values()];
  if (values.length === 0) return { people, rels };

  const base =
    rootPersonId != null && levels.has(rootPersonId)
      ? levels.get(rootPersonId)!
      : Math.min(...values);

  const keep = new Set<number>();
  for (const p of people) {
    const lv = levels.get(p.id);
    if (lv == null) continue;
    if (lv - base <= maxGenerations - 1) keep.add(p.id);
  }

  // أبقِ الأزواج الظاهرين مع المحفوظين
  for (const r of rels) {
    if (r.type !== "spouse") continue;
    if (keep.has(r.fromPersonId)) keep.add(r.toPersonId);
    if (keep.has(r.toPersonId)) keep.add(r.fromPersonId);
  }

  const filteredPeople = people.filter((p) => keep.has(p.id));
  const filteredRels = rels.filter(
    (r) => keep.has(r.fromPersonId) && keep.has(r.toPersonId),
  );
  return { people: filteredPeople, rels: filteredRels };
}
