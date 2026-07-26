import type { Person } from "@db/tables";
import type { PersonGap } from "@/lib/personGaps";
import { discoveryDismissKey } from "@/lib/dismissedDiscoveries";

export type ResearchTourItem = {
  key: string;
  personId: number;
  personName: string;
  kind: PersonGap["kind"];
};

/** صفوف جولة البحث من خريطة النواقص مع استبعاد المخفي */
export function buildResearchTourItems(
  gapsById: Map<number, PersonGap[]>,
  peopleById: Map<number, Person>,
  dismissedKeys: string[],
  opts?: {
    homeId?: number | null;
    favoriteIds?: number[];
    recentIds?: number[];
    /** إن وُجد: اقتصر الجولة على هؤلاء الأشخاص */
    allowedPersonIds?: Set<number> | null;
  },
): ResearchTourItem[] {
  const dismissed = new Set(dismissedKeys);
  const fav = new Set(opts?.favoriteIds ?? []);
  const allowed = opts?.allowedPersonIds ?? null;
  const recent = new Map<number, number>();
  (opts?.recentIds ?? []).forEach((id, i) => recent.set(id, i));

  const rank = (id: number) => {
    if (opts?.homeId != null && id === opts.homeId) return 0;
    if (fav.has(id)) return 1;
    if (recent.has(id)) return 10 + (recent.get(id) ?? 0);
    return 100;
  };

  const items: ResearchTourItem[] = [];
  for (const [personId, gaps] of gapsById) {
    if (allowed && !allowed.has(personId)) continue;
    const person = peopleById.get(personId);
    if (!person) continue;
    for (const g of gaps) {
      const key = discoveryDismissKey(g.kind, personId);
      if (dismissed.has(key)) continue;
      items.push({
        key,
        personId,
        personName: person.givenName,
        kind: g.kind,
      });
    }
  }

  items.sort((a, b) => {
    const ra = rank(a.personId);
    const rb = rank(b.personId);
    if (ra !== rb) return ra - rb;
    return a.personName.localeCompare(b.personName, "ar");
  });
  return items;
}
