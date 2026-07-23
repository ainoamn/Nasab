import type { Person, Relationship } from "@db/schema";

export type ParentPair = { fatherId: number | null; motherId: number | null };

export function getParents(
  childId: number,
  rels: Relationship[],
  byId: Map<number, Person>,
): ParentPair {
  const fathers: number[] = [];
  const mothers: number[] = [];
  for (const r of rels) {
    if (r.type !== "parent" || r.toPersonId !== childId) continue;
    const p = byId.get(r.fromPersonId);
    if (!p) continue;
    if (p.gender === "female") {
      if (!mothers.includes(r.fromPersonId)) mothers.push(r.fromPersonId);
    } else if (!fathers.includes(r.fromPersonId)) {
      fathers.push(r.fromPersonId);
    }
  }

  const motherId = mothers[0] ?? null;
  let fatherId: number | null = null;

  if (fathers.length === 1) {
    fatherId = fathers[0];
  } else if (fathers.length > 1) {
    if (motherId) {
      const spousesOf = buildSpousesOf(rels);
      const spouseIds = new Set(spousesOf.get(motherId) ?? []);
      fatherId = fathers.find((f) => spouseIds.has(f)) ?? fathers[0];
    } else {
      fatherId = fathers[0];
    }
  }

  return { fatherId, motherId };
}

export function buildSpousesOf(rels: Relationship[]): Map<number, number[]> {
  const spousesOf = new Map<number, number[]>();
  for (const r of rels) {
    if (r.type !== "spouse") continue;
    for (const [a, b] of [
      [r.fromPersonId, r.toPersonId],
      [r.toPersonId, r.fromPersonId],
    ] as const) {
      const arr = spousesOf.get(a) ?? [];
      if (!arr.includes(b)) arr.push(b);
      spousesOf.set(a, arr);
    }
  }
  return spousesOf;
}

export function buildChildrenOf(rels: Relationship[]): Map<number, number[]> {
  const childrenOf = new Map<number, number[]>();
  for (const r of rels) {
    if (r.type !== "parent") continue;
    const kids = childrenOf.get(r.fromPersonId) ?? [];
    if (!kids.includes(r.toPersonId)) kids.push(r.toPersonId);
    childrenOf.set(r.fromPersonId, kids);
  }
  return childrenOf;
}

export function oppositeSpouses(
  person: Person,
  spousesOf: Map<number, number[]>,
  byId: Map<number, Person>,
): Person[] {
  return (spousesOf.get(person.id) ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is Person => !!p && p.gender !== person.gender);
}

/**
 * أبناء زوجين. strict=true للزوجة ضمن تعدد الزوجات (يجب تطابق الأم).
 * strict=false للزوجين الوحidين (يقبل ابناً مرتبطاً بالأب فقط).
 */
export function childrenOfPair(
  fatherId: number | null,
  motherId: number | null,
  childrenOf: Map<number, number[]>,
  rels: Relationship[],
  byId: Map<number, Person>,
  strict = false,
): number[] {
  if (!fatherId && !motherId) return [];

  const candidates = new Set<number>();
  if (fatherId) {
    for (const id of childrenOf.get(fatherId) ?? []) candidates.add(id);
  }
  if (motherId) {
    for (const id of childrenOf.get(motherId) ?? []) candidates.add(id);
  }

  return Array.from(candidates).filter((childId) => {
    const { fatherId: f, motherId: m } = getParents(childId, rels, byId);

    if (fatherId && f !== fatherId) return false;
    if (motherId && m && m !== motherId) return false;

    if (strict) {
      // عمود زوجة في تعدد الزوجات: يكفي ربط الأم، أو كلاهما
      if (motherId && m !== motherId) return false;
      if (fatherId && f && f !== fatherId) return false;
      if (motherId && m === motherId) return true;
      if (fatherId && f === fatherId) return true;
      return false;
    }

    // زوجان واحدان: يظهر الابن المرتبط بأحدهما أو كليهما
    if (fatherId && motherId) {
      if (f === fatherId && m === motherId) return true;
      if (f === fatherId && !m) return true;
      if (m === motherId && (!f || f === fatherId)) return true;
      return false;
    }

    if (fatherId) return f === fatherId;
    if (motherId) return m === motherId;
    return false;
  });
}

/** أبناء مرتبطون بالأب فقط (بدون أم أو أم غير زوجة) */
export function childrenWithFatherOnly(
  fatherId: number,
  wives: Person[],
  childrenOf: Map<number, number[]>,
  rels: Relationship[],
  byId: Map<number, Person>,
): number[] {
  const wifeIds = new Set(wives.map((w) => w.id));
  return (childrenOf.get(fatherId) ?? []).filter((childId) => {
    const { fatherId: f, motherId: m } = getParents(childId, rels, byId);
    if (f !== fatherId) return false;
    if (!m) return true;
    return !wifeIds.has(m);
  });
}

/** كل أبناء شخص (أب أو أم) */
export function directChildren(
  personId: number,
  childrenOf: Map<number, number[]>,
): number[] {
  return childrenOf.get(personId) ?? [];
}

/** يجمع الأقارب المرتبطين بشخص: آباء، أبناء، أحفاد، وأزواج */
export function collectFocusedSubgraph(
  focusId: number,
  people: Person[],
  rels: Relationship[],
): { people: Person[]; rels: Relationship[] } {
  const byId = new Map(people.map((p) => [p.id, p]));
  if (!byId.has(focusId)) {
    return { people, rels };
  }

  const included = new Set<number>([focusId]);
  const childrenOf = buildChildrenOf(rels);
  const spousesOf = buildSpousesOf(rels);

  const walkUp = (startId: number) => {
    const queue = [startId];
    const seen = new Set<number>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;
      seen.add(current);
      const { fatherId, motherId } = getParents(current, rels, byId);
      for (const parentId of [fatherId, motherId]) {
        if (parentId == null || !byId.has(parentId) || seen.has(parentId)) continue;
        included.add(parentId);
        queue.push(parentId);
      }
    }
  };

  const walkDown = (startId: number) => {
    const queue = [startId];
    const seen = new Set<number>();
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const kid of childrenOf.get(id) ?? []) {
        if (byId.has(kid)) {
          included.add(kid);
          queue.push(kid);
        }
      }
    }
  };

  walkUp(focusId);
  walkDown(focusId);

  for (const id of [...included]) {
    for (const sid of spousesOf.get(id) ?? []) {
      if (byId.has(sid)) included.add(sid);
    }
  }

  const filteredPeople = people.filter((p) => included.has(p.id));
  const filteredRels = rels.filter(
    (r) => included.has(r.fromPersonId) && included.has(r.toPersonId),
  );
  return { people: filteredPeople, rels: filteredRels };
}

/** يجمع كل الأشخاص المتصلين بالجذور عبر الأبناء والأزواج */
export function collectReachableFromRoots(
  rootIds: number[],
  childrenOf: Map<number, number[]>,
  spousesOf: Map<number, number[]>,
): Set<number> {
  const reachable = new Set<number>();
  const queue = [...rootIds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    for (const kid of childrenOf.get(id) ?? []) queue.push(kid);
    for (const sid of spousesOf.get(id) ?? []) queue.push(sid);
  }
  return reachable;
}

/** أشخاص غير متصلين بجذور الشجرة (لا يظهرون في المخطط) */
export function findUnlinkedPersonIds(
  people: Person[],
  rels: Relationship[],
): Set<number> {
  if (people.length === 0) return new Set();

  const childIds = new Set<number>();
  for (const r of rels) {
    if (r.type === "parent") childIds.add(r.toPersonId);
  }

  const roots = people.filter((p) => !childIds.has(p.id));
  const rootIds =
    roots.length > 0 ? roots.map((r) => r.id) : [people[0]!.id];

  const childrenOf = buildChildrenOf(rels);
  const spousesOf = buildSpousesOf(rels);
  const reachable = collectReachableFromRoots(rootIds, childrenOf, spousesOf);

  return new Set(people.filter((p) => !reachable.has(p.id)).map((p) => p.id));
}
