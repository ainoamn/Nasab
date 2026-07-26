import type { Person, Relationship } from "@db/tables";
import { relationToFocus, type RelationKey } from "@/lib/relationshipLabel";

export type PathVia = "start" | "parent" | "child" | "spouse";

export type PathHop = {
  personId: number;
  via: PathVia;
};

export type PathLabelKey =
  | RelationKey
  | "uncle"
  | "aunt"
  | "nephew"
  | "niece"
  | "cousin"
  | "connected";

type Edge = { to: number; via: Exclude<PathVia, "start"> };

function buildAdj(
  people: Person[],
  rels: Relationship[],
): Map<number, Edge[]> {
  const adj = new Map<number, Edge[]>();
  const add = (from: number, to: number, via: Edge["via"]) => {
    const arr = adj.get(from) ?? [];
    if (!arr.some((e) => e.to === to && e.via === via)) arr.push({ to, via });
    adj.set(from, arr);
  };

  for (const r of rels) {
    if (r.type === "parent") {
      add(r.toPersonId, r.fromPersonId, "parent");
      add(r.fromPersonId, r.toPersonId, "child");
    } else if (r.type === "spouse") {
      add(r.fromPersonId, r.toPersonId, "spouse");
      add(r.toPersonId, r.fromPersonId, "spouse");
    }
  }

  for (const p of people) {
    if (!adj.has(p.id)) adj.set(p.id, []);
  }
  return adj;
}

/** أقصر مسار قرابة عبر أب/ابن/زوج */
export function findRelationPath(
  fromId: number,
  toId: number,
  people: Person[],
  rels: Relationship[],
): PathHop[] | null {
  if (fromId === toId) return [{ personId: fromId, via: "start" }];
  const ids = new Set(people.map((p) => p.id));
  if (!ids.has(fromId) || !ids.has(toId)) return null;

  const adj = buildAdj(people, rels);
  const prev = new Map<number, { from: number; via: Edge["via"] }>();
  const q: number[] = [fromId];
  const seen = new Set<number>([fromId]);

  while (q.length) {
    const cur = q.shift()!;
    for (const e of adj.get(cur) ?? []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      prev.set(e.to, { from: cur, via: e.via });
      if (e.to === toId) {
        const hops: PathHop[] = [];
        let at = toId;
        while (at !== fromId) {
          const step = prev.get(at)!;
          hops.push({ personId: at, via: step.via });
          at = step.from;
        }
        hops.push({ personId: fromId, via: "start" });
        hops.reverse();
        return hops;
      }
      q.push(e.to);
    }
  }
  return null;
}

/**
 * تصنيف علاقة أوضح من «قريب» عند المسارات القصيرة الشائعة.
 */
export function classifyRelationPath(
  fromId: number,
  toId: number,
  people: Person[],
  rels: Relationship[],
  path: PathHop[] | null,
): PathLabelKey {
  if (fromId === toId) return "self";
  const near = relationToFocus(fromId, toId, people, rels);
  if (near !== "relative") return near;
  if (!path || path.length < 2) return "connected";

  const vias = path.slice(1).map((h) => h.via);
  const byId = new Map(people.map((p) => [p.id, p]));
  const target = byId.get(toId);
  const female = target?.gender === "female";

  // إخوة: أب مشترك ثم نزول
  if (vias.length === 2 && vias[0] === "parent" && vias[1] === "child") {
    return female ? "sister" : "brother";
  }

  // عم/خالة: صعود جيلين ثم نزول لأخ الأب/الأم
  if (
    vias.length === 3 &&
    vias[0] === "parent" &&
    vias[1] === "parent" &&
    vias[2] === "child"
  ) {
    return female ? "aunt" : "uncle";
  }

  // ابن أخ/أخت: صعود ثم نزول لأخ ثم لابنه
  if (
    vias.length === 3 &&
    vias[0] === "parent" &&
    vias[1] === "child" &&
    vias[2] === "child"
  ) {
    return female ? "niece" : "nephew";
  }

  // ابن عم/خالة
  if (
    vias.length === 4 &&
    vias[0] === "parent" &&
    vias[1] === "parent" &&
    vias[2] === "child" &&
    vias[3] === "child"
  ) {
    return "cousin";
  }

  return vias.length <= 6 ? "relative" : "connected";
}
