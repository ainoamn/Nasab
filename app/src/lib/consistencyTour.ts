import type { Discovery } from "@/lib/discoveries";
import { discoveryDismissKey } from "@/lib/dismissedDiscoveries";

export const CONSISTENCY_KINDS = new Set([
  "deathBeforeBirth",
  "childBeforeParent",
  "possibleDuplicate",
  "livingNoBirthYear",
]);

export type ConsistencyTourItem = {
  key: string;
  kind: Discovery["kind"];
  personId: number;
  personName: string;
  otherPersonId?: number;
  otherPersonName?: string;
};

/** صفوف جولة فحص الاتساق من اكتشافات الجودة فقط */
export function buildConsistencyTourItems(
  discoveries: Discovery[],
  dismissedKeys: string[],
  opts?: {
    homeId?: number | null;
    favoriteIds?: number[];
    recentIds?: number[];
    allowedPersonIds?: Set<number> | null;
  },
): ConsistencyTourItem[] {
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

  const items: ConsistencyTourItem[] = [];
  for (const d of discoveries) {
    if (!CONSISTENCY_KINDS.has(d.kind)) continue;
    if (allowed && !allowed.has(d.personId)) continue;
    const key = discoveryDismissKey(d.kind, d.personId, d.otherPersonId);
    if (dismissed.has(key)) continue;
    items.push({
      key,
      kind: d.kind,
      personId: d.personId,
      personName: d.personName,
      otherPersonId: d.otherPersonId,
      otherPersonName: d.otherPersonName,
    });
  }

  items.sort((a, b) => {
    const ra = Math.min(rank(a.personId), rank(a.otherPersonId ?? -1));
    const rb = Math.min(rank(b.personId), rank(b.otherPersonId ?? -1));
    if (ra !== rb) return ra - rb;
    return a.personName.localeCompare(b.personName, "ar");
  });
  return items;
}
