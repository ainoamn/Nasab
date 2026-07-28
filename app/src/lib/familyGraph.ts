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

/**
 * إذا اشترك ذكر وأنثى كأبوين لنفس الابن دون رابط زوجية صريح،
 * نعتبرهما زوجين للتخطيط حتى لا تنفصل الزوجة عن الزوج في المخطط.
 */
export function augmentSpousesFromCoParents(
  rels: Relationship[],
  byId: Map<number, Person>,
  spousesOf: Map<number, number[]>,
): Map<number, number[]> {
  const result = new Map<number, number[]>();
  for (const [k, v] of spousesOf) {
    result.set(k, [...v]);
  }

  const add = (a: number, b: number) => {
    if (a === b) return;
    const arr = result.get(a) ?? [];
    if (!arr.includes(b)) {
      arr.push(b);
      result.set(a, arr);
    }
  };

  const parentsOfChild = new Map<number, number[]>();
  for (const r of rels) {
    if (r.type !== "parent") continue;
    if (!byId.has(r.fromPersonId) || !byId.has(r.toPersonId)) continue;
    const arr = parentsOfChild.get(r.toPersonId) ?? [];
    if (!arr.includes(r.fromPersonId)) arr.push(r.fromPersonId);
    parentsOfChild.set(r.toPersonId, arr);
  }

  for (const parentIds of parentsOfChild.values()) {
    const parents = parentIds
      .map((id) => byId.get(id))
      .filter((p): p is Person => !!p);
    const males = parents.filter((p) => p.gender === "male");
    const females = parents.filter((p) => p.gender === "female");
    for (const m of males) {
      for (const f of females) {
        add(m.id, f.id);
        add(f.id, m.id);
      }
    }
  }

  return result;
}

/**
 * جذر الفرع الأكبر (بعدد الأفراد) — غالباً الخط الرئيسي للشجرة.
 * فروع أنساب الأزواج تبقى أصغر ولا تُعرض كشجرة مستقلة في الصفحة الرئيسية.
 */
export function findPrimaryBranchRootId(
  people: { branchId: number | null }[],
  branches: { id: number; rootPersonId: number }[],
): number | null {
  if (branches.length === 0) return null;
  const counts = new Map<number, number>();
  for (const p of people) {
    if (p.branchId == null) continue;
    counts.set(p.branchId, (counts.get(p.branchId) ?? 0) + 1);
  }
  let bestBranchId: number | null = null;
  let bestCount = -1;
  for (const [branchId, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestBranchId = branchId;
    }
  }
  if (bestBranchId == null) return null;
  return branches.find((b) => b.id === bestBranchId)?.rootPersonId ?? null;
}

/** عدد الأحفاد عبر الأبناء فقط (لتفضيل الجذر الأقوى) */
export function countDescendants(
  rootId: number,
  childrenOf: Map<number, number[]>,
): number {
  let n = 0;
  const queue = [rootId];
  const seen = new Set<number>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const kid of childrenOf.get(id) ?? []) {
      n++;
      queue.push(kid);
    }
  }
  return n;
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
 * أبناء زوجين.
 * strict=true: الأم يجب أن تطابق صراحة (لتعدد الزوجات — لا يُخلط أبناء زوجة بأخرى).
 * strict=false: يقبل أيضاً ابناً مربوطاً بالأب فقط دون أم مسجّلة.
 */
export function childrenOfPair(
  fatherId: number | null,
  motherId: number | null,
  childrenOf: Map<number, number[]>,
  rels: Relationship[],
  byId: Map<number, Person>,
  strict = true,
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

    // لا يظهر ابن أم أخرى تحت هذه الزوجة أبداً
    if (motherId && m != null && m !== motherId) return false;
    // لا يظهر ابن أب آخر تحت هذا الأب أبداً
    if (fatherId && f != null && f !== fatherId) return false;

    if (fatherId && motherId) {
      if (f === fatherId && m === motherId) return true;
      // ابن بلا أم مسجّلة: فقط في غير الصارم (زوجان واحدان)
      if (!strict && f === fatherId && m == null) return true;
      // ابن مربوط بالأم فقط (بلا أب): غير الصارم
      if (!strict && m === motherId && f == null) return true;
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

/**
 * أبناء الأسرة لشخص: أبناؤه مباشرة + أبناء كل زوج/زوجة
 * (بما فيهم المسجّلون على طرف واحد فقط — فجوة بيانات شائعة).
 * لا يخلط أبناء زوجة أخرى عند تعدد الزوجات.
 */
export function familyChildrenOf(
  personId: number,
  childrenOf: Map<number, number[]>,
  spousesOf: Map<number, number[]>,
  rels: Relationship[],
  byId: Map<number, Person>,
  opts?: { includeSpouseLineage?: boolean },
): number[] {
  const person = byId.get(personId);
  if (!person) return directChildren(personId, childrenOf);

  const seen = new Set<number>();
  const out: number[] = [];
  const add = (id: number) => {
    if (seen.has(id) || id === personId) return;
    seen.add(id);
    out.push(id);
  };

  for (const kid of directChildren(personId, childrenOf)) add(kid);

  const spouses = oppositeSpouses(person, spousesOf, byId);
  for (const sp of spouses) {
    const fatherId =
      person.gender === "male"
        ? personId
        : sp.gender === "male"
          ? sp.id
          : null;
    const motherId =
      person.gender === "female"
        ? personId
        : sp.gender === "female"
          ? sp.id
          : null;
    for (const kid of childrenOfPair(
      fatherId,
      motherId,
      childrenOf,
      rels,
      byId,
      false,
    )) {
      add(kid);
    }
    if (opts?.includeSpouseLineage) {
      for (const kid of directChildren(sp.id, childrenOf)) add(kid);
    }
  }

  return out;
}

/** يجمع الأقارب المرتبطين بشخص: آباء، إخوة مسار الأسلاف، أبناء، أحفاد، وأزواج */
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
  const ancestorPath: number[] = [];

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
        ancestorPath.push(parentId);
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

  // إخوة على مسار الأسلاف (مثلاً أبناء صالح عند التركيز على مريم)
  // ثم نسل هؤلاء الإخوة حتى تظهر عائلاتهم تحت الأب في المخطط
  const collateralSeeds: number[] = [];
  for (const ancestorId of ancestorPath) {
    for (const kid of childrenOf.get(ancestorId) ?? []) {
      if (!byId.has(kid) || included.has(kid)) continue;
      included.add(kid);
      collateralSeeds.push(kid);
    }
  }
  for (const seed of collateralSeeds) {
    walkDown(seed);
  }

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
