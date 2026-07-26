import type { Person, Relationship } from "@db/schema";
import { GENERATION_COLORS } from "@contracts/constants";
import {
  buildChildrenOf,
  buildSpousesOf,
  childrenOfPair,
  directChildren,
  getParents,
  oppositeSpouses,
} from "@/lib/familyGraph";

export type PrintTreeMeta = {
  name: string;
  tribe?: string | null;
  region?: string | null;
  description?: string | null;
};

/**
 * حساب الجيل بالثبات: gen(طفل) = max(gen(الوالدان)) + 1
 * الأخ/العم/الأب — نفس الجيل. يُصحّح خطأ BFS السابق.
 */
export function assignGenerationsStable(
  people: Person[],
  rels: Relationship[],
): Map<number, number> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const levels = new Map<number, number>();

  const hasParent = new Set<number>();
  for (const r of rels) {
    if (r.type === "parent") hasParent.add(r.toPersonId);
  }

  for (const p of people) {
    if (!hasParent.has(p.id)) levels.set(p.id, 0);
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < people.length + 10) {
    changed = false;
    guard++;
    for (const p of people) {
      const { fatherId, motherId } = getParents(p.id, rels, byId);
      const parentIds = [fatherId, motherId].filter(
        (id): id is number => id != null && byId.has(id),
      );
      if (parentIds.length === 0) {
        if (!levels.has(p.id)) {
          levels.set(p.id, 0);
          changed = true;
        }
        continue;
      }
      const parentGens = parentIds
        .map((id) => levels.get(id))
        .filter((g): g is number => g !== undefined);
      if (parentGens.length === 0) continue;
      const newGen = Math.max(...parentGens) + 1;
      if (levels.get(p.id) !== newGen) {
        levels.set(p.id, newGen);
        changed = true;
      }
    }
  }

  let alignGuard = 0;
  while (alignGuard < people.length + 10) {
    alignGuard++;
    let changed = false;
    if (alignSpouseGenerations(people, rels, levels, byId)) changed = true;
    if (alignCoParentGenerations(people, rels, levels, byId)) changed = true;
    if (!changed) break;
  }

  for (const p of people) {
    if (!levels.has(p.id)) levels.set(p.id, 0);
  }
  return levels;
}

/** محاذاة الأب والأم — الأم تتبع جيل الأب (لا جيل منفصل) */
function alignCoParentGenerations(
  people: Person[],
  rels: Relationship[],
  levels: Map<number, number>,
  byId: Map<number, Person>,
): boolean {
  const seen = new Set<string>();
  let changed = false;
  for (const p of people) {
    const { fatherId, motherId } = getParents(p.id, rels, byId);
    const parents = [fatherId, motherId].filter(
      (id): id is number => id != null && byId.has(id),
    );
    if (parents.length < 2) continue;
    const key = [...parents].sort((a, b) => a - b).join("-");
    if (seen.has(key)) continue;
    seen.add(key);

    const father = fatherId != null ? byId.get(fatherId) : undefined;
    const mother = motherId != null ? byId.get(motherId) : undefined;
    const fGen = fatherId != null ? levels.get(fatherId) : undefined;
    const mGen = motherId != null ? levels.get(motherId) : undefined;

    if (father && mother && fGen !== undefined) {
      if (levels.get(mother.id) !== fGen) {
        levels.set(mother.id, fGen);
        changed = true;
      }
      if (mGen !== undefined && fGen !== mGen && levels.get(father.id) !== fGen) {
        levels.set(father.id, fGen);
        changed = true;
      }
      continue;
    }

    const gens = parents
      .map((id) => levels.get(id))
      .filter((g): g is number => g !== undefined);
    if (gens.length < 2) continue;
    const aligned = Math.max(...gens);
    for (const pid of parents) {
      if (levels.get(pid) !== aligned) {
        levels.set(pid, aligned);
        changed = true;
      }
    }
  }
  return changed;
}

/** الزوجة/ الزوج — الأنثى تأخذ جيل الزوج الذكر في خط النسب */
function enforcePatrilinealSpouseGenerations(
  people: Person[],
  rels: Relationship[],
  levels: Map<number, number>,
  byId: Map<number, Person>,
): boolean {
  const spousesOf = buildSpousesOf(rels);
  let changed = false;

  for (const p of people) {
    if (p.gender !== "female") continue;
    for (const sid of spousesOf.get(p.id) ?? []) {
      const husband = byId.get(sid);
      if (!husband || husband.gender !== "male") continue;
      const hGen = levels.get(husband.id);
      if (hGen === undefined) continue;
      if (levels.get(p.id) !== hGen) {
        levels.set(p.id, hGen);
        changed = true;
      }
      break;
    }
  }

  for (const p of people) {
    const { fatherId, motherId } = getParents(p.id, rels, byId);
    if (fatherId == null || motherId == null) continue;
    if (!byId.has(fatherId) || !byId.has(motherId)) continue;
    const fGen = levels.get(fatherId);
    if (fGen === undefined) continue;
    if (levels.get(motherId) !== fGen) {
      levels.set(motherId, fGen);
      changed = true;
    }
  }

  return changed;
}

/** الزوج/الزوجة في صف واحد — يُرفَع الجيل الأدنى ليطابق الأعلى */
function alignSpouseGenerations(
  people: Person[],
  rels: Relationship[],
  levels: Map<number, number>,
  byId: Map<number, Person>,
  fromRoot?: Set<number>,
): boolean {
  const spousesOf = buildSpousesOf(rels);
  let changed = false;
  for (const p of people) {
    const myGen = levels.get(p.id);
    if (myGen === undefined) continue;
    for (const sid of spousesOf.get(p.id) ?? []) {
      if (!byId.has(sid)) continue;
      const sGen = levels.get(sid);

      let target: number;
      if (fromRoot) {
        const pIn = fromRoot.has(p.id);
        const sIn = fromRoot.has(sid);
        if (pIn && !sIn) {
          target = myGen;
        } else if (!pIn && sIn && sGen !== undefined) {
          target = sGen;
        } else if (sGen === undefined) {
          target = myGen;
        } else {
          target = Math.max(myGen, sGen);
        }
      } else if (sGen === undefined) {
        target = myGen;
      } else {
        target = Math.max(myGen, sGen);
      }

      if (levels.get(p.id) !== target) {
        levels.set(p.id, target);
        changed = true;
      }
      if (levels.get(sid) !== target) {
        levels.set(sid, target);
        changed = true;
      }
    }
  }
  return changed;
}

function markDescendantsFromRoot(
  rootPersonId: number,
  childrenOf: Map<number, number[]>,
  ids: Set<number>,
): Set<number> {
  const fromRoot = new Set<number>([rootPersonId]);
  const queue = [rootPersonId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const kid of childrenOf.get(id) ?? []) {
      if (!ids.has(kid) || fromRoot.has(kid)) continue;
      fromRoot.add(kid);
      queue.push(kid);
    }
  }
  return fromRoot;
}

/**
 * أجيال الطباعة من الجذر المختار:
 * - النسل من الجذر يحدد الجيل
 * - الزوجة/الزوج يأخذ جيل شريكه في خط النسب (لا جيل منفصل)
 */
export function assignGenerationsFromPrintRoot(
  rootPersonId: number,
  people: Person[],
  rels: Relationship[],
): Map<number, number> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const ids = new Set(people.map((p) => p.id));
  const childrenOf = buildChildrenOf(rels);
  const levels = new Map<number, number>();

  if (!ids.has(rootPersonId)) return levels;

  const fromRoot = markDescendantsFromRoot(rootPersonId, childrenOf, ids);
  levels.set(rootPersonId, 0);

  for (const r of rels) {
    if (r.type !== "parent" || r.toPersonId !== rootPersonId) continue;
    const pid = r.fromPersonId;
    if (ids.has(pid)) levels.set(pid, -1);
  }

  const queue = [rootPersonId];
  const seen = new Set<number>([rootPersonId]);
  while (queue.length > 0) {
    const id = queue.shift()!;
    const gen = levels.get(id)!;
    for (const kid of childrenOf.get(id) ?? []) {
      if (!ids.has(kid)) continue;
      const childGen = gen + 1;
      const prev = levels.get(kid);
      if (prev === undefined || prev > childGen) levels.set(kid, childGen);
      if (!seen.has(kid)) {
        seen.add(kid);
        queue.push(kid);
      }
    }
  }

  for (const p of people) {
    const childGen = levels.get(p.id);
    if (childGen === undefined) continue;
    const { fatherId, motherId } = getParents(p.id, rels, byId);
    for (const pid of [fatherId, motherId]) {
      if (pid == null || !ids.has(pid)) continue;
      const parentGen = childGen - 1;
      if (!levels.has(pid)) levels.set(pid, parentGen);
    }
  }

  let guard = 0;
  while (guard < people.length + 10) {
    guard++;
    let changed = false;
    if (alignSpouseGenerations(people, rels, levels, byId, fromRoot)) changed = true;
    if (alignCoParentGenerations(people, rels, levels, byId)) changed = true;
    for (const p of people) {
      const childGen = levels.get(p.id);
      if (childGen === undefined) continue;
      const { fatherId, motherId } = getParents(p.id, rels, byId);
      for (const pid of [fatherId, motherId]) {
        if (pid == null || !ids.has(pid) || levels.has(pid)) continue;
        levels.set(pid, childGen - 1);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const spousesOf = buildSpousesOf(rels);
  for (const p of people) {
    if (levels.has(p.id)) continue;
    for (const sid of spousesOf.get(p.id) ?? []) {
      const sGen = levels.get(sid);
      if (sGen !== undefined) {
        levels.set(p.id, sGen);
        break;
      }
    }
    if (!levels.has(p.id)) levels.set(p.id, 0);
  }

  alignSpouseGenerations(people, rels, levels, byId, fromRoot);
  alignCoParentGenerations(people, rels, levels, byId);

  let finalGuard = 0;
  while (
    finalGuard < people.length + 5 &&
    enforcePatrilinealSpouseGenerations(people, rels, levels, byId)
  ) {
    finalGuard++;
  }

  return levels;
}

/** @deprecated استخدم assignGenerationsStable أو levels من buildPrintSubgraph */
export function assignGenerations(
  people: Person[],
  rels: Relationship[],
): Map<number, number> {
  return assignGenerationsStable(people, rels);
}

export type GenerationGroup = { level: number; people: Person[] };

export function generationSpan(levels: Map<number, number>): {
  min: number;
  max: number;
  count: number;
} {
  if (levels.size === 0) return { min: 0, max: 0, count: 0 };
  const vals = [...levels.values()];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  return { min, max, count: max - min + 1 };
}

/** جيل العرض في الطباعة — مع تصحيح الزوجات لجيل أزواجهن */
export function printGenerationLevel(
  person: Person,
  levels: Map<number, number>,
  rels: Relationship[],
  byId: Map<number, Person>,
): number | undefined {
  const level = levels.get(person.id);
  if (person.gender !== "female") return level;

  const spousesOf = buildSpousesOf(rels);
  for (const sid of spousesOf.get(person.id) ?? []) {
    const husband = byId.get(sid);
    if (!husband || husband.gender !== "male") continue;
    const hGen = levels.get(husband.id);
    if (hGen !== undefined) return hGen;
  }
  return level;
}

/** رقم الجيل للعرض: الجذر = 1، الأبناء = 2… */
export function displayGenerationNumber(level: number): number {
  return level + 1;
}

export function groupByGeneration(
  people: Person[],
  levels: Map<number, number>,
): GenerationGroup[] {
  if (people.length === 0) return [];
  const span = generationSpan(levels);
  const groups: GenerationGroup[] = [];
  for (let level = span.min; level <= span.max; level++) {
    const groupPeople = people.filter((p) => (levels.get(p.id) ?? 0) === level);
    if (groupPeople.length > 0) groups.push({ level, people: groupPeople });
  }
  return groups;
}

export function generationColor(level: number): string {
  const n = GENERATION_COLORS.length;
  const idx = ((level % n) + n) % n;
  return GENERATION_COLORS[idx] ?? "#0F5132";
}

export type PlaceCluster = {
  place: string;
  count: number;
  people: Person[];
};

export function clusterByBirthPlace(people: Person[]): PlaceCluster[] {
  const map = new Map<string, Person[]>();
  for (const p of people) {
    const place = (p.birthPlace?.trim() || p.deathPlace?.trim() || "").slice(0, 64);
    if (!place) continue;
    const arr = map.get(place) ?? [];
    arr.push(p);
    map.set(place, arr);
  }
  return [...map.entries()]
    .map(([place, list]) => ({ place, count: list.length, people: list }))
    .sort((a, b) => b.count - a.count);
}

export type ClanLevel = {
  label: string;
  kind: "tribe" | "laqab" | "clan" | "family";
  people: Person[];
};

export function buildClanHierarchy(
  tree: PrintTreeMeta,
  people: Person[],
): ClanLevel[] {
  const levels: ClanLevel[] = [];
  const tribe = tree.tribe?.trim();
  if (tribe) levels.push({ label: tribe, kind: "tribe", people });

  const laqabs = [...new Set(people.map((p) => p.laqab).filter(Boolean))] as string[];
  if (laqabs.length === 1) {
    levels.push({ label: laqabs[0], kind: "laqab", people });
  } else if (laqabs.length > 1) {
    for (const l of laqabs) {
      levels.push({ label: l, kind: "laqab", people: people.filter((p) => p.laqab === l) });
    }
  }

  const clans = [...new Set(people.map((p) => p.clan).filter(Boolean))] as string[];
  if (clans.length === 1) {
    levels.push({ label: clans[0], kind: "clan", people });
  } else if (clans.length > 1) {
    for (const c of clans) {
      levels.push({ label: c, kind: "clan", people: people.filter((p) => p.clan === c) });
    }
  }

  levels.push({ label: tree.name, kind: "family", people });
  return levels;
}

export function personDisplayName(p: Person): string {
  return [p.givenName, p.fatherName].filter(Boolean).join(" ");
}

export function fullNasabName(p: Person, laqabFallback?: string | null): string {
  const parts = [p.givenName];
  if (p.fatherName) parts.push(`بن ${p.fatherName}`);
  const laqab = p.laqab?.trim() || laqabFallback?.trim();
  if (laqab) parts.push(laqab);
  return parts.join(" ");
}

export function formatBirthYear(p: Person): string | null {
  if (!p.birthYear) return null;
  if (p.isLiving) return `${p.birthYear}`;
  if (p.deathYear) return `${p.birthYear} – ${p.deathYear}`;
  return `${p.birthYear}`;
}

export function findPrimaryRoots(people: Person[], rels: Relationship[]): Person[] {
  const hasParent = new Set<number>();
  for (const r of rels) {
    if (r.type === "parent") hasParent.add(r.toPersonId);
  }
  return people.filter((p) => !hasParent.has(p.id));
}

export function buildAscendantChain(
  personId: number,
  people: Person[],
  rels: Relationship[],
  maxDepth = 8,
): Person[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const chain: Person[] = [];
  let current = byId.get(personId);
  let depth = 0;

  while (current && depth < maxDepth) {
    chain.unshift(current);
    const { fatherId, motherId } = getParents(current.id, rels, byId);
    const nextId = fatherId ?? motherId;
    if (!nextId) break;
    current = byId.get(nextId);
    depth++;
  }
  return chain;
}

export type FanPosition = { x: number; y: number; angle: number };

export function computeFanLayout(
  people: Person[],
  levels: Map<number, number>,
  rootPersonId?: number,
): Map<number, FanPosition> {
  const positions = new Map<number, FanPosition>();
  const cx = 50;
  const cy = 92;
  const startAngle = -165;
  const endAngle = -15;

  const byLevel = new Map<number, Person[]>();
  for (const p of people) {
    const g = levels.get(p.id) ?? 0;
    const arr = byLevel.get(g) ?? [];
    arr.push(p);
    byLevel.set(g, arr);
  }

  const keys = [...byLevel.keys()];
  const rootLevel =
    rootPersonId != null ? (levels.get(rootPersonId) ?? 0) : keys.length > 0 ? Math.min(...keys) : 0;
  const sortedLevels = keys.filter((l) => l >= rootLevel).sort((a, b) => a - b);

  sortedLevels.forEach((level, ringIdx) => {
    const group = byLevel.get(level) ?? [];
    if (group.length === 0) return;
    const radius = 6 + ringIdx * 11;
    const span = endAngle - startAngle;
    group.forEach((p, i) => {
      const t = group.length === 1 ? 0.5 : i / Math.max(1, group.length - 1);
      const angleDeg = startAngle + t * span;
      const rad = (angleDeg * Math.PI) / 180;
      positions.set(p.id, {
        x: cx + radius * Math.cos(rad),
        y: cy + radius * Math.sin(rad),
        angle: angleDeg,
      });
    });
  });

  return positions;
}

export type SunPosition = {
  x: number;
  y: number;
  /** زاوية من محور الشرق بالدرجات (عكس عقارب الساعة) */
  angle: number;
  ring: number;
  isSpouse?: boolean;
};

export type SunEdge = { fromId: number; toId: number };

export type SunLayout = {
  positions: Map<number, SunPosition>;
  /** روابط أب/أم ← ابن */
  edges: SunEdge[];
  /** روابط الزوج ↔ الزوجة على نفس الحلقة */
  spouseEdges: SunEdge[];
  ringCount: number;
  rootIds: number[];
};

/**
 * تخطيط شمس النسب بنمط MyHeritage:
 * الجذر وزوجته في المركز، الأبناء حلقات متحدة المركز،
 * والزوج/الزوجة متلاصقان على نفس الحلقة، والروابط من منتصف الزوجين.
 *
 * يحجز زاوية حسب حجم الفرع ويفرض مسافة دنيا بين العقد على كل حلقة
 * حتى لا تتداخل الأسماء الطويلة.
 */
export function computeSunLayout(
  people: Person[],
  rels: Relationship[],
  levels: Map<number, number>,
  rootPersonId: number,
): SunLayout {
  const positions = new Map<number, SunPosition>();
  const edges: SunEdge[] = [];
  const spouseEdges: SunEdge[] = [];
  const byId = new Map(people.map((p) => [p.id, p]));
  const empty: SunLayout = { positions, edges, spouseEdges, ringCount: 0, rootIds: [] };

  if (!byId.has(rootPersonId) || people.length === 0) return empty;

  const childrenOf = buildChildrenOf(rels);
  const spousesOf = buildSpousesOf(rels);
  const cx = 50;
  const cy = 50;
  const rootLevel = levels.get(rootPersonId) ?? 0;

  // نصف قطر خارجي يتسع مع كثافة الشجرة
  const density = Math.max(1, people.length);
  const outerRadius = Math.min(47.5, 38 + Math.min(9, Math.log2(density + 1) * 2.2));

  const placeAt = (id: number, angleDeg: number, ring: number, isSpouse = false) => {
    positions.set(id, { x: cx, y: cy, angle: angleDeg, ring, isSpouse });
  };

  const kidsOf = (id: number): number[] =>
    directChildren(id, childrenOf)
      .filter((cid) => byId.has(cid))
      .sort((a, b) =>
        personDisplayName(byId.get(a)!).localeCompare(personDisplayName(byId.get(b)!), "ar"),
      );

  /** أبناء الدم لشخص + أزواجه داخل الشجرة المطبوعة */
  const bloodKids = (id: number): number[] => {
    const person = byId.get(id);
    if (!person) return [];
    const spouseIds = oppositeSpouses(person, spousesOf, byId).map((s) => s.id);
    const seen = new Set<number>();
    const out: number[] = [];
    for (const pid of [id, ...spouseIds]) {
      for (const cid of kidsOf(pid)) {
        if (seen.has(cid)) continue;
        const childLvl = levels.get(cid) ?? 0;
        const parentLvl = levels.get(pid) ?? rootLevel;
        if (childLvl <= parentLvl) continue;
        seen.add(cid);
        out.push(cid);
      }
    }
    return out;
  };

  const weightMemo = new Map<number, number>();
  const subtreeWeight = (id: number, depth = 0): number => {
    if (weightMemo.has(id)) return weightMemo.get(id)!;
    if (depth > 40) return 1;
    const person = byId.get(id);
    if (!person) return 1;
    const kids = bloodKids(id);
    const spouses = oppositeSpouses(person, spousesOf, byId).length;
    const w =
      1 +
      spouses * 0.35 +
      kids.reduce((sum, kid) => sum + subtreeWeight(kid, depth + 1), 0);
    weightMemo.set(id, w);
    return w;
  };

  const rootPerson = byId.get(rootPersonId)!;
  const rootSpouseIds = oppositeSpouses(rootPerson, spousesOf, byId).map((s) => s.id);
  const rootIds = [rootPersonId, ...rootSpouseIds];

  placeAt(rootPersonId, 180, 0);
  rootSpouseIds.forEach((sid) => placeAt(sid, 0, 0, true));
  if (rootSpouseIds.length > 0) {
    spouseEdges.push({ fromId: rootPersonId, toId: rootSpouseIds[0]! });
  }

  type Slot = { id: number; start: number; end: number; ring: number; parentId: number };
  const queue: Slot[] = [];
  const placed = new Set<number>(rootIds);

  const rootKids = bloodKids(rootPersonId);
  if (rootKids.length === 0) {
    const gap = 3.8;
    rootIds.forEach((id, i) => {
      const pos = positions.get(id)!;
      const x = cx - ((rootIds.length - 1) * gap) / 2 + i * gap;
      positions.set(id, { ...pos, x, y: cy, angle: i === 0 ? 180 : 0 });
    });
    return { positions, edges, spouseEdges, ringCount: 1, rootIds };
  }

  const totalRootW = rootKids.reduce((s, id) => s + subtreeWeight(id), 0) || rootKids.length;
  let cursor = -90;
  rootKids.forEach((cid) => {
    const span = (360 * subtreeWeight(cid)) / totalRootW;
    queue.push({ id: cid, start: cursor, end: cursor + span, ring: 1, parentId: rootPersonId });
    cursor += span;
  });

  while (queue.length > 0) {
    const slot = queue.shift()!;
    if (placed.has(slot.id) || !byId.has(slot.id)) continue;

    const span = slot.end - slot.start;
    const mid = (slot.start + slot.end) / 2;
    placeAt(slot.id, mid, slot.ring);
    placed.add(slot.id);
    edges.push({ fromId: slot.parentId, toId: slot.id });

    const person = byId.get(slot.id)!;
    const spouses = oppositeSpouses(person, spousesOf, byId).filter((s) => !placed.has(s.id));
    // فجوة زوجية صغيرة داخل نفس الشريحة — لا تسرق زاوية الأبناء
    const spouseGap = Math.min(2.4, Math.max(1.1, span * 0.06));
    spouses.forEach((sp, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const spouseAngle = mid + dir * spouseGap * (Math.floor(i / 2) + 1);
      placeAt(sp.id, spouseAngle, slot.ring, true);
      placed.add(sp.id);
      spouseEdges.push({ fromId: slot.id, toId: sp.id });
    });

    const kids = bloodKids(slot.id).filter((k) => !placed.has(k));
    if (kids.length === 0) continue;

    const usable = span * 0.92;
    const pad = (span - usable) / 2;
    const kidWeights = kids.map((id) => subtreeWeight(id));
    const tw = kidWeights.reduce((a, b) => a + b, 0) || kids.length;
    let kCursor = slot.start + pad;
    kids.forEach((cid, i) => {
      const childSpan = (usable * kidWeights[i]!) / tw;
      queue.push({
        id: cid,
        start: kCursor,
        end: kCursor + childSpan,
        ring: slot.ring + 1,
        parentId: slot.id,
      });
      kCursor += childSpan;
    });
  }

  // متبقون — وزّعهم بانتظام على حلقتهم بدل الزوايا العشوائية
  const leftovers = people.filter((p) => !placed.has(p.id));
  if (leftovers.length > 0) {
    const byRing = new Map<number, Person[]>();
    for (const p of leftovers) {
      const ring = Math.max(1, (levels.get(p.id) ?? rootLevel) - rootLevel);
      const list = byRing.get(ring) ?? [];
      list.push(p);
      byRing.set(ring, list);
    }
    for (const [ring, list] of byRing) {
      list.forEach((p, i) => {
        const angle = -90 + (360 * (i + 0.5)) / list.length;
        placeAt(p.id, angle, ring);
        placed.add(p.id);
      });
    }
  }

  const maxRing = Math.max(1, ...[...positions.values()].map((p) => p.ring));

  /** مسافة زاوية دنيا على الحلقة — تقل مع اتساع المحيط */
  const minGapForRing = (ring: number, count: number): number => {
    if (count <= 1) return 0;
    const radiusPct = (ring / maxRing) * outerRadius;
    // قوس أدنى ≈ 2.8 وحدة نسبية على المحيط (حوالي عرض اسم قصير)
    const arcMin = ring <= 1 ? 4.2 : ring === 2 ? 3.4 : 2.8;
    const fromArc = (arcMin / Math.max(radiusPct, 8)) * (180 / Math.PI);
    const even = 360 / count;
    return Math.min(even, Math.max(2.2, fromArc));
  };

  // إعادة توزيع كل حلقة لفرض فجوة دنيا مع الحفاظ على الترتيب الزاوي
  for (let ring = 1; ring <= maxRing; ring++) {
    const nodes = [...positions.entries()]
      .filter(([, p]) => p.ring === ring && !p.isSpouse)
      .map(([id, p]) => ({ id, angle: p.angle, pos: p }))
      .sort((a, b) => a.angle - b.angle);
    if (nodes.length <= 1) continue;

    const minGap = minGapForRing(ring, nodes.length);
    const angles = nodes.map((n) => n.angle);

    // مرّتان لكفاية الالتفاف حول الدائرة
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < angles.length; i++) {
        const next = (i + 1) % angles.length;
        let delta = angles[next]! - angles[i]!;
        if (next === 0) delta += 360;
        if (delta >= minGap) continue;
        const need = minGap - delta;
        angles[next] = angles[next]! + need / 2;
        angles[i] = angles[i]! - need / 2;
      }
      // طبّع داخل [-180, 540) ثم أعد الترتيب النسبي
      for (let i = 0; i < angles.length; i++) {
        while (angles[i]! < -180) angles[i]! += 360;
        while (angles[i]! >= 540) angles[i]! -= 360;
      }
    }

    // إن بقي تداخل شديد: توزيع منتظم مع الحفاظ على الترتيب
    let tight = false;
    for (let i = 0; i < angles.length; i++) {
      const next = (i + 1) % angles.length;
      let delta = angles[next]! - angles[i]!;
      if (next === 0) delta += 360;
      if (delta < minGap * 0.85) {
        tight = true;
        break;
      }
    }
    if (tight || nodes.length * minGap > 360) {
      const start = angles[0]!;
      const step = 360 / nodes.length;
      for (let i = 0; i < angles.length; i++) angles[i] = start + i * step;
    }

    nodes.forEach((n, i) => {
      const pos = positions.get(n.id)!;
      positions.set(n.id, { ...pos, angle: angles[i]! });
      // حرّك الأزواج مع المحور
      for (const e of spouseEdges) {
        if (e.fromId !== n.id && e.toId !== n.id) continue;
        const spouseId = e.fromId === n.id ? e.toId : e.fromId;
        const sp = positions.get(spouseId);
        if (!sp || sp.ring !== ring) continue;
        const side = sp.angle >= n.angle ? 1 : -1;
        positions.set(spouseId, {
          ...sp,
          angle: angles[i]! + side * Math.min(2.2, minGap * 0.35),
        });
      }
    });
  }

  const step = outerRadius / maxRing;

  // المركز: الزوجان جنباً إلى جنب أفقياً
  const gap = 3.6;
  const orderedRoot = [...rootIds].sort((a, b) => {
    const pa = byId.get(a)!;
    const pb = byId.get(b)!;
    if (pa.gender !== pb.gender) return pa.gender === "male" ? -1 : 1;
    return a - b;
  });
  orderedRoot.forEach((id, i) => {
    const pos = positions.get(id);
    if (!pos) return;
    const x = cx - ((orderedRoot.length - 1) * gap) / 2 + i * gap;
    positions.set(id, {
      ...pos,
      x,
      y: cy,
      angle: i < orderedRoot.length / 2 ? 180 : 0,
      ring: 0,
    });
  });

  for (const [id, pos] of positions) {
    if (pos.ring === 0) continue;
    const radius = pos.ring * step;
    const rad = (pos.angle * Math.PI) / 180;
    positions.set(id, {
      ...pos,
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    });
  }

  return { positions, edges, spouseEdges, ringCount: maxRing + 1, rootIds: orderedRoot };
}

export function pedigreeColumns(
  people: Person[],
  levels: Map<number, number>,
): GenerationGroup[] {
  return groupByGeneration(people, levels);
}

export function sortPeopleByGeneration(
  people: Person[],
  levels: Map<number, number>,
): Person[] {
  return [...people].sort((a, b) => {
    const ga = levels.get(a.id) ?? 0;
    const gb = levels.get(b.id) ?? 0;
    if (ga !== gb) return ga - gb;
    return personDisplayName(a).localeCompare(personDisplayName(b), "ar");
  });
}

export type PalmFrondBranch = {
  /** الأب والأم على السعف */
  father: Person | null;
  mother: Person | null;
  /** الأبناء — خوص السعف */
  children: Person[];
  /** الأحفاد — أطراف السعف (جيل إضافي) */
  grandchildren: Person[];
};

export type PalmTreeLayout = {
  founder: Person | null;
  fronds: PalmFrondBranch[];
};

/** تخطيط النخلة: جذع = جذر النسب، سعف = أب+أم، خوص = أبناء */
export function buildPalmTreeLayout(
  people: Person[],
  rels: Relationship[],
  levels: Map<number, number>,
  rootPersonId: number,
): PalmTreeLayout {
  if (people.length === 0) return { founder: null, fronds: [] };

  const byId = new Map(people.map((p) => [p.id, p]));
  const childrenOf = buildChildrenOf(rels);
  const spousesOf = buildSpousesOf(rels);

  const founder = byId.get(rootPersonId) ?? null;
  if (!founder) return { founder: null, fronds: [] };

  const founderLevel = levels.get(founder.id) ?? 0;

  const branchHeadIds = directChildren(founder.id, childrenOf)
    .filter((id) => {
      if (!byId.has(id)) return false;
      const childLevel = levels.get(id) ?? 0;
      return childLevel > founderLevel;
    })
    .sort((a, b) => personDisplayName(byId.get(a)!).localeCompare(personDisplayName(byId.get(b)!), "ar"));

  const fronds: PalmFrondBranch[] = branchHeadIds.map((headId) => {
    const head = byId.get(headId)!;
    let father: Person | null = null;
    let mother: Person | null = null;

    if (head.gender === "male") {
      father = head;
      mother = oppositeSpouses(head, spousesOf, byId)[0] ?? null;
    } else {
      mother = head;
      father = oppositeSpouses(head, spousesOf, byId)[0] ?? null;
    }

    const childIds = childrenOfPair(
      father?.id ?? null,
      mother?.id ?? null,
      childrenOf,
      rels,
      byId,
    ).filter((id) => byId.has(id));

    const headLevel = levels.get(headId) ?? founderLevel + 1;
    const children = childIds
      .map((id) => byId.get(id)!)
      .filter((p) => (levels.get(p.id) ?? 0) > headLevel)
      .sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), "ar"));

    const grandchildIds = new Set<number>();
    for (const child of children) {
      const childLevel = levels.get(child.id) ?? 0;
      for (const gid of directChildren(child.id, childrenOf)) {
        if (!byId.has(gid) || grandchildIds.has(gid)) continue;
        if ((levels.get(gid) ?? 0) > childLevel) grandchildIds.add(gid);
      }
    }
    const grandchildren = [...grandchildIds]
      .map((id) => byId.get(id)!)
      .sort((a, b) => personDisplayName(a).localeCompare(personDisplayName(b), "ar"));

    return { father, mother, children, grandchildren };
  });

  return { founder, fronds };
}

export function formatPalmCouple(father: Person | null, mother: Person | null): string {
  const parts: string[] = [];
  if (father) parts.push(personDisplayName(father));
  if (mother) parts.push(personDisplayName(mother));
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function isPersonLiving(p: Person): boolean {
  return p.isLiving === true || (p.isLiving as unknown) === 1;
}

export type PrintGenerationStats = {
  level: number;
  total: number;
  males: number;
  females: number;
  living: number;
  deceased: number;
};

export type PrintStats = {
  total: number;
  males: number;
  females: number;
  living: number;
  deceased: number;
  generationCount: number;
  byGeneration: PrintGenerationStats[];
};

export function computePrintStats(
  people: Person[],
  levels: Map<number, number>,
  rels?: Relationship[],
): PrintStats {
  const byId = new Map(people.map((p) => [p.id, p]));
  const effectiveLevels = new Map(levels);
  if (rels) {
    for (const p of people) {
      const g = printGenerationLevel(p, effectiveLevels, rels, byId);
      if (g !== undefined) effectiveLevels.set(p.id, g);
    }
  }

  let males = 0;
  let females = 0;
  let living = 0;
  let deceased = 0;

  for (const p of people) {
    if (p.gender === "female") females++;
    else males++;
    if (isPersonLiving(p)) living++;
    else deceased++;
  }

  const byGeneration = groupByGeneration(people, effectiveLevels).map(({ level, people: group }) => {
    let gMales = 0;
    let gFemales = 0;
    let gLiving = 0;
    let gDeceased = 0;
    for (const p of group) {
      if (p.gender === "female") gFemales++;
      else gMales++;
      if (isPersonLiving(p)) gLiving++;
      else gDeceased++;
    }
    return {
      level,
      total: group.length,
      males: gMales,
      females: gFemales,
      living: gLiving,
      deceased: gDeceased,
    };
  });

  return {
    total: people.length,
    males,
    females,
    living,
    deceased,
    generationCount: generationSpan(effectiveLevels).count,
    byGeneration,
  };
}
