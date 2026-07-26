import type { Person, Relationship } from "@db/tables";

export type TreeOccasion = {
  key: string;
  kind: "birthday" | "anniversary";
  month: number;
  day: number;
  label: string;
  person?: Person;
  secondaryPerson?: Person;
  /** أيام حتى المناسبة (0 = اليوم) */
  daysUntil: number;
};

export function daysUntilMd(month: number, day: number, from = new Date()): number {
  const y = from.getFullYear();
  let next = new Date(y, month - 1, day);
  const today = new Date(y, from.getMonth(), from.getDate());
  if (next < today) next = new Date(y + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

/** مناسبات السنة القادمة: أعياد ميلاد وذكريات زواج */
export function buildTreeOccasions(
  people: Person[],
  rels: Relationship[],
  opts?: { limit?: number },
): TreeOccasion[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const list: TreeOccasion[] = [];

  for (const p of people) {
    if (p.birthMonth && p.birthDay) {
      list.push({
        key: `b-${p.id}`,
        kind: "birthday",
        month: p.birthMonth,
        day: p.birthDay,
        label: p.givenName,
        person: p,
        daysUntil: daysUntilMd(p.birthMonth, p.birthDay),
      });
    }
  }

  for (const r of rels) {
    if (r.type !== "spouse") continue;
    const mm = r.marriageMonth;
    const md = r.marriageDay;
    if (!mm || !md) continue;
    const a = byId.get(r.fromPersonId);
    const b = byId.get(r.toPersonId);
    if (!a || !b) continue;
    list.push({
      key: `m-${r.id}`,
      kind: "anniversary",
      month: mm,
      day: md,
      label: `${a.givenName} × ${b.givenName}`,
      person: a,
      secondaryPerson: b,
      daysUntil: daysUntilMd(mm, md),
    });
  }

  list.sort((x, y) => x.daysUntil - y.daysUntil || x.label.localeCompare(y.label, "ar"));
  if (opts?.limit != null) return list.slice(0, opts.limit);
  return list;
}

export function groupOccasionsByMonth(
  events: TreeOccasion[],
): Array<{ month: number; items: TreeOccasion[] }> {
  const map = new Map<number, TreeOccasion[]>();
  for (const ev of events) {
    const arr = map.get(ev.month) ?? [];
    arr.push(ev);
    map.set(ev.month, arr);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month, items]) => ({ month, items }));
}
