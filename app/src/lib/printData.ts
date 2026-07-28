import type { Person, Relationship } from "@db/schema";
import { GENERATION_COLORS } from "@contracts/constants";
import {
  buildChildrenOf,
  buildSpousesOf,
  childrenOfPair,
  directChildren,
  familyChildrenOf,
  getParents,
  oppositeSpouses,
} from "@/lib/familyGraph";
import { preferredParentId } from "@/lib/printLineage";
import { birthSortKey } from "@/lib/birthOrder";
import { sortSpouses } from "@/lib/spouseMeta";
import { twinGroupSize } from "@/lib/twins";

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
  spousesOf: Map<number, number[]>,
  rels: Relationship[],
  byId: Map<number, Person>,
  ids: Set<number>,
): Set<number> {
  const fromRoot = new Set<number>([rootPersonId]);
  const queue = [rootPersonId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const kid of familyChildrenOf(id, childrenOf, spousesOf, rels, byId)) {
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
  const spousesOf = buildSpousesOf(rels);
  const levels = new Map<number, number>();

  if (!ids.has(rootPersonId)) return levels;

  const fromRoot = markDescendantsFromRoot(
    rootPersonId,
    childrenOf,
    spousesOf,
    rels,
    byId,
    ids,
  );
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
    for (const kid of familyChildrenOf(id, childrenOf, spousesOf, rels, byId)) {
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

export function stripNasabPrefix(s: string): string {
  return s.trim().replace(/^(بن|بنت)\s+/u, "");
}

export function personDisplayName(p: Person): string {
  if (!p.fatherName?.trim()) return p.givenName;
  return `${p.givenName} ${stripNasabPrefix(p.fatherName)}`;
}

/** أول مقطع من الاسم الشخصي (قبل بن/بنت أو المسافة) */
export function firstGivenName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed.split(/\s+/)[0]!;
}

export function fullNasabName(p: Person, laqabFallback?: string | null): string {
  const parts = [p.givenName];
  if (p.fatherName?.trim()) {
    const f = stripNasabPrefix(p.fatherName);
    parts.push(p.gender === "female" ? `بنت ${f}` : `بن ${f}`);
  }
  const laqab = p.laqab?.trim() || laqabFallback?.trim();
  if (laqab) parts.push(laqab);
  return parts.join(" ");
}

/** اسم العرض حسب إعداد الطباعة — دون اختصار حسب الحلقة */
export function formatPrintChartName(
  p: Person,
  nameMode: "full" | "firstOnly",
  laqabFallback?: string | null,
): string {
  if (nameMode === "firstOnly") return firstGivenName(p.givenName);
  return fullNasabName(p, laqabFallback);
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
        x: Math.min(96, Math.max(4, cx + radius * Math.cos(rad))),
        y: Math.min(90, Math.max(6, cy + radius * Math.sin(rad))),
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
  /** زوج/زوجة من خارج خط النسب — قمر صناعي بجانب الأصل */
  isSpouse?: boolean;
  /** إزاحة شعاعية نسبية (− للداخل، + للخارج) عن محيط الحلقة */
  radiusBias?: number;
  /** فهرس الزوج حول الأصل (لتعدد الزوجات) */
  spouseIndex?: number;
  /**
   * رابط زواج بين فردين كلاهما في خط النسب (مثل أبناء العم)
   * — يُرسَم بخط خفيف دون نقل أحدهما من فرعه
   */
  crossBranchSpouse?: boolean;
};

export type SunEdge = { fromId: number; toId: number };

export type SunLayout = {
  positions: Map<number, SunPosition>;
  /** روابط نسب: أصل العائلة ← ابن/ابنة (خط واحد فقط) */
  edges: SunEdge[];
  /** روابط زواج: أصل ↔ زوج/زوجة من خارج النسب */
  spouseEdges: SunEdge[];
  ringCount: number;
  /** جذر خط النسب فقط (بدون الأزواج) */
  rootIds: number[];
};

/**
 * تخطيط شمس النسب:
 * - حلقة النسب = أبناء الدم من الجذر فقط
 * - الزوج/الزوجة من خارج العائلة = قمر صناعي متصل بزوجه (لا يُحسب في خط النسب)
 * - خط الأبناء يخرج من الأصل فقط (ليس من منتصف الزوجين)
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

  const density = Math.max(1, people.length);
  const outerRadius = Math.min(47.5, 38 + Math.min(9, Math.log2(density + 1) * 2.2));

  const placeAt = (
    id: number,
    angleDeg: number,
    ring: number,
    opts?: { isSpouse?: boolean; radiusBias?: number; spouseIndex?: number },
  ) => {
    positions.set(id, {
      x: cx,
      y: cy,
      angle: angleDeg,
      ring,
      isSpouse: opts?.isSpouse,
      radiusBias: opts?.radiusBias,
      spouseIndex: opts?.spouseIndex,
    });
  };

  const kidsOf = (id: number): number[] =>
    familyChildrenOf(id, childrenOf, spousesOf, rels, byId)
      .filter((cid) => byId.has(cid))
      .sort((a, b) => birthSortKey(byId.get(a)!) - birthSortKey(byId.get(b)!));

  /** نسل الدم من شخص (يتجاهل جيل الأزواج الدخلاء) */
  const bloodKids = (id: number): number[] => {
    const parentLvl = levels.get(id) ?? rootLevel;
    const seen = new Set<number>();
    const out: number[] = [];
    for (const cid of kidsOf(id)) {
      if (seen.has(cid)) continue;
      const childLvl = levels.get(cid);
      if (childLvl !== undefined && childLvl < parentLvl) continue;
      seen.add(cid);
      out.push(cid);
    }
    return out;
  };

  // خط النسب من الجذر (قبل ترتيب الأبناء حتى نفضّل الوالد من الدم)
  const bloodline = new Set<number>([rootPersonId]);
  {
    const q = [rootPersonId];
    while (q.length > 0) {
      const id = q.shift()!;
      for (const kid of bloodKids(id)) {
        if (bloodline.has(kid)) continue;
        bloodline.add(kid);
        q.push(kid);
      }
    }
  }

  /**
   * الوالد المعتمد في مخطط الشمس:
   * الأب من خط النسب أولاً، وإلا الأم من النسب — حتى يبقى أبناء وداد تحت وداد لا تحت الزوج الدخيل.
   */
  const layoutPreferredParent = (childId: number): number | null => {
    const { fatherId, motherId } = getParents(childId, rels, byId);
    if (fatherId != null && bloodline.has(fatherId)) return fatherId;
    if (motherId != null && bloodline.has(motherId)) return motherId;
    if (fatherId != null && byId.has(fatherId)) return fatherId;
    if (motherId != null && byId.has(motherId)) return motherId;
    return fatherId ?? motherId;
  };

  /**
   * ترتيب الأبناء: مجموعات حسب الزوج/الزوجة الآخر (أبناء وداد ثم أبناء عبلة…)،
   * وداخل كل مجموعة حسب تاريخ الميلاد — دون خلط أبجدي بين الأمهات.
   */
  const orderKidsByOtherParent = (parentId: number, kids: number[]): number[] => {
    if (kids.length <= 1) return kids;
    const parent = byId.get(parentId);
    if (!parent) return kids;

    const groupKey = (childId: number): number | "none" => {
      const { fatherId, motherId } = getParents(childId, rels, byId);
      const other =
        parent.gender === "male"
          ? motherId
          : parent.gender === "female"
            ? fatherId
            : motherId ?? fatherId;
      return other ?? "none";
    };

    const groups = new Map<number | "none", number[]>();
    for (const kid of kids) {
      const key = groupKey(kid);
      const list = groups.get(key) ?? [];
      list.push(kid);
      groups.set(key, list);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => birthSortKey(byId.get(a)!) - birthSortKey(byId.get(b)!));
    }

    const spouseOrder = sortSpouses(
      oppositeSpouses(parent, spousesOf, byId),
      rels,
      parentId,
    ).map((s) => s.id);

    const keys = [...groups.keys()].sort((a, b) => {
      if (a === "none") return 1;
      if (b === "none") return -1;
      const ia = spouseOrder.indexOf(a);
      const ib = spouseOrder.indexOf(b);
      if (ia >= 0 && ib >= 0) return ia - ib;
      if (ia >= 0) return -1;
      if (ib >= 0) return 1;
      const pa = byId.get(a);
      const pb = byId.get(b);
      if (pa && pb) {
        return personDisplayName(pa).localeCompare(personDisplayName(pb), "ar");
      }
      return a - b;
    });

    return keys.flatMap((k) => groups.get(k) ?? []);
  };

  /** أبناء يُعرضون تحت هذا الشخص فقط — مجمّعون حسب الأم/الأب الآخر */
  const layoutKids = (id: number): number[] => {
    const kids = bloodKids(id).filter((cid) => layoutPreferredParent(cid) === id);
    return orderKidsByOtherParent(id, kids);
  };

  const inLawSpousesOf = (id: number): Person[] => {
    const person = byId.get(id);
    if (!person) return [];
    const seen = new Set<number>();
    const out: Person[] = [];
    const add = (p: Person | undefined) => {
      if (!p || p.id === id || bloodline.has(p.id) || seen.has(p.id)) return;
      if (!byId.has(p.id)) return;
      seen.add(p.id);
      out.push(p);
    };

    // روابط الزوجية المسجّلة
    for (const s of oppositeSpouses(person, spousesOf, byId)) add(s);

    // أمهات/آباء الأبناء غير المسجّلين كزوج — شائع مع تعدد الزوجات
    for (const kid of bloodKids(id)) {
      const { fatherId, motherId } = getParents(kid, rels, byId);
      for (const pid of [fatherId, motherId]) {
        if (pid == null || pid === id) continue;
        add(byId.get(pid));
      }
    }

    return out.sort((a, b) =>
      personDisplayName(a).localeCompare(personDisplayName(b), "ar"),
    );
  };

  const weightMemo = new Map<number, number>();
  const subtreeWeight = (id: number, depth = 0): number => {
    if (weightMemo.has(id)) return weightMemo.get(id)!;
    if (depth > 40) return 1;
    const kids = layoutKids(id).filter((k) => bloodline.has(k));
    const w = 1.15 + kids.reduce((sum, kid) => sum + subtreeWeight(kid, depth + 1), 0);
    weightMemo.set(id, w);
    return w;
  };

  const estMaxRing = Math.max(
    2,
    ...[...levels.values()].map((v) => Math.max(1, v - rootLevel)),
  );

  /** فجوة زاوية تضمن فصل أيقونات الزوجات (~4.5% قوس) */
  const spouseFanDeg = (ring: number, count: number): number => {
    if (count <= 1) return 0;
    const radiusPct = Math.max(8, ((ring - 0.35) / estMaxRing) * outerRadius);
    const desiredArc = 4.6;
    return Math.min(28, Math.max(9, (desiredArc / radiusPct) * (180 / Math.PI)));
  };

  /** إرفاق كل الزوجات كأقمار منفصلة بجانب الأصل */
  const attachInLawSpouses = (bloodId: number, angle: number, ring: number) => {
    const spouses = inLawSpousesOf(bloodId).filter((s) => !positions.has(s.id));
    if (spouses.length === 0) return;
    const fan = spouseFanDeg(Math.max(1, ring), spouses.length);
    spouses.forEach((sp, i) => {
      const nudge = (i - (spouses.length - 1) / 2) * fan;
      placeAt(sp.id, angle + nudge, ring, {
        isSpouse: true,
        radiusBias: ring === 0 ? 0 : -0.4,
        spouseIndex: i,
      });
      spouseEdges.push({ fromId: bloodId, toId: sp.id });
    });
  };

  placeAt(rootPersonId, 0, 0);
  attachInLawSpouses(rootPersonId, 0, 0);

  type Slot = { id: number; start: number; end: number; ring: number; parentId: number };
  const queue: Slot[] = [];
  const placedBlood = new Set<number>([rootPersonId]);

  const rootKids = layoutKids(rootPersonId).filter((k) => bloodline.has(k));
  if (rootKids.length === 0) {
    // جذر فقط (+ أزواج)
    const rootSpouses = inLawSpousesOf(rootPersonId);
    positions.set(rootPersonId, {
      ...positions.get(rootPersonId)!,
      x: cx,
      y: cy,
      angle: 0,
      ring: 0,
    });
    rootSpouses.forEach((sp, i) => {
      const gap = 5.5;
      const x = cx + (i - (rootSpouses.length - 1) / 2) * gap;
      const pos = positions.get(sp.id)!;
      positions.set(sp.id, { ...pos, x, y: cy + 4.2, angle: 0, ring: 0, isSpouse: true });
    });
    return {
      positions,
      edges,
      spouseEdges,
      ringCount: 1,
      rootIds: [rootPersonId],
    };
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
    if (placedBlood.has(slot.id) || !byId.has(slot.id)) continue;

    const span = slot.end - slot.start;
    const mid = (slot.start + slot.end) / 2;
    placeAt(slot.id, mid, slot.ring);
    placedBlood.add(slot.id);
    edges.push({ fromId: slot.parentId, toId: slot.id });
    attachInLawSpouses(slot.id, mid, slot.ring);

    const kids = layoutKids(slot.id).filter((k) => bloodline.has(k) && !placedBlood.has(k));
    if (kids.length === 0) continue;

    // فواصل زاوية بين مجموعات الأمهات (أبناء وداد | فراغ | أبناء عبلة)
    const otherKey = (childId: number): number | "none" => {
      const parent = byId.get(slot.id);
      const { fatherId, motherId } = getParents(childId, rels, byId);
      const other =
        parent?.gender === "male"
          ? motherId
          : parent?.gender === "female"
            ? fatherId
            : motherId ?? fatherId;
      return other ?? "none";
    };
    const groupBreakAfter = new Set<number>();
    for (let i = 0; i < kids.length - 1; i++) {
      if (otherKey(kids[i]!) !== otherKey(kids[i + 1]!)) groupBreakAfter.add(i);
    }
    const gutterCount = groupBreakAfter.size;
    // فواصل خفيفة بين مجموعات الأمهات دون تقليص القطاع (يحافظ على شكل الشمس)
    const gutterShare = Math.min(0.1, gutterCount * 0.028);
    const usable = span * (0.94 - gutterShare);
    const pad = (span - usable) / 2;
    const kidWeights = kids.map((id) => subtreeWeight(id));
    const tw = kidWeights.reduce((a, b) => a + b, 0) || kids.length;
    const gutterUnit = gutterCount > 0 ? (span * gutterShare) / gutterCount : 0;
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
      if (groupBreakAfter.has(i)) kCursor += gutterUnit;
    });
  }

  // متبقون من خط النسب — قرب الوالد من الدم (الترتيب النهائي على الحلقة لاحقاً)
  for (const p of people) {
    if (positions.has(p.id)) continue;
    if (!bloodline.has(p.id)) continue;
    const pref = layoutPreferredParent(p.id);
    const parentId =
      pref != null && positions.has(pref)
        ? pref
        : (() => {
            const { fatherId, motherId } = getParents(p.id, rels, byId);
            if (fatherId != null && bloodline.has(fatherId) && positions.has(fatherId))
              return fatherId;
            if (motherId != null && bloodline.has(motherId) && positions.has(motherId))
              return motherId;
            if (fatherId != null && positions.has(fatherId)) return fatherId;
            if (motherId != null && positions.has(motherId)) return motherId;
            return null;
          })();
    const parentPos = parentId != null ? positions.get(parentId) : undefined;
    if (parentPos && parentId != null) {
      const ring = Math.max(
        parentPos.ring + 1,
        Math.max(1, (levels.get(p.id) ?? rootLevel) - rootLevel),
      );
      placeAt(p.id, parentPos.angle, ring);
      edges.push({ fromId: parentId, toId: p.id });
      attachInLawSpouses(p.id, parentPos.angle, ring);
    }
  }

  // أزواج لم يُربطوا بعد (مثلاً زوج لشخص متبقٍ)
  for (const id of [...bloodline]) {
    if (!positions.has(id)) continue;
    const pos = positions.get(id)!;
    attachInLawSpouses(id, pos.angle, pos.ring);
  }

  // أي شخص متبقٍ غير موضوع — قرب الوالد المعتمد
  let orphanIdx = 0;
  for (const p of people) {
    if (positions.has(p.id)) continue;
    const pref = layoutPreferredParent(p.id);
    const { fatherId, motherId } = getParents(p.id, rels, byId);
    const parentId =
      (pref != null && positions.has(pref) ? pref : null) ??
      (fatherId != null && positions.has(fatherId) ? fatherId : null) ??
      (motherId != null && positions.has(motherId) ? motherId : null);
    const parentPos = parentId != null ? positions.get(parentId) : undefined;
    if (parentPos && parentId != null) {
      const ring = Math.max(parentPos.ring + 1, 1);
      placeAt(p.id, parentPos.angle + 4, ring, {
        isSpouse: !bloodline.has(p.id),
        radiusBias: bloodline.has(p.id) ? 0 : -0.35,
      });
      if (bloodline.has(p.id)) edges.push({ fromId: parentId, toId: p.id });
      else spouseEdges.push({ fromId: parentId, toId: p.id });
    } else {
      const ring = Math.max(1, (levels.get(p.id) ?? rootLevel) - rootLevel);
      placeAt(p.id, -90 + (360 * (orphanIdx + 0.5)) / Math.max(people.length, 1), ring);
      orphanIdx++;
    }
  }

  const maxRing = Math.max(
    1,
    ...[...positions.values()].filter((p) => !p.isSpouse).map((p) => p.ring),
  );

  /** مسافة زاوية دنيا على الحلقة — تقل مع اتساع المحيط */
  const minGapForRing = (ring: number, count: number): number => {
    if (count <= 1) return 0;
    const radiusPct = (ring / maxRing) * outerRadius;
    const arcMin = ring <= 1 ? 4.2 : ring === 2 ? 3.4 : 2.8;
    const fromArc = (arcMin / Math.max(radiusPct, 8)) * (180 / Math.PI);
    const even = 360 / count;
    return Math.min(even, Math.max(2.2, fromArc));
  };

  // إعادة توزيع كل حلقة على كامل الدائرة مع الحفاظ على الترتيب (شكل الشمس)
  for (let ring = 1; ring <= maxRing; ring++) {
    const nodes = [...positions.entries()]
      .filter(([, p]) => p.ring === ring && !p.isSpouse)
      .map(([id, p]) => ({ id, angle: p.angle }))
      .sort((a, b) => a.angle - b.angle);
    if (nodes.length <= 1) continue;

    const minGap = minGapForRing(ring, nodes.length);
    const angles = nodes.map((n) => n.angle);

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
      for (let i = 0; i < angles.length; i++) {
        while (angles[i]! < -180) angles[i]! += 360;
        while (angles[i]! >= 540) angles[i]! -= 360;
      }
    }

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
      const evenStep = 360 / nodes.length;
      for (let i = 0; i < angles.length; i++) angles[i] = start + i * evenStep;
    }

    nodes.forEach((n, i) => {
      const pos = positions.get(n.id)!;
      const ang = angles[i]!;
      positions.set(n.id, { ...pos, angle: ang });
      const spouseIds = spouseEdges
        .filter((e) => e.fromId === n.id || e.toId === n.id)
        .map((e) => (e.fromId === n.id ? e.toId : e.fromId))
        .filter((sid) => {
          const sp = positions.get(sid);
          return sp?.isSpouse && sp.ring === ring;
        });
      const fan = spouseFanDeg(ring, spouseIds.length);
      spouseIds.forEach((spouseId, si) => {
        const sp = positions.get(spouseId)!;
        positions.set(spouseId, {
          ...sp,
          angle: ang + (si - (spouseIds.length - 1) / 2) * fan,
          radiusBias: -0.4,
          spouseIndex: si,
          ring,
        });
      });
    });
  }

  const step = outerRadius / maxRing;

  // المركز: الأصل في المنتصف، والزوجات على قوس واضح أسفله
  const rootPos = positions.get(rootPersonId)!;
  positions.set(rootPersonId, {
    ...rootPos,
    x: cx,
    y: cy,
    angle: 0,
    ring: 0,
    isSpouse: false,
    radiusBias: 0,
  });
  const rootSpouseIds = [
    ...new Set(
      spouseEdges
        .filter((e) => e.fromId === rootPersonId || e.toId === rootPersonId)
        .map((e) => (e.fromId === rootPersonId ? e.toId : e.fromId)),
    ),
  ].filter((sid) => byId.has(sid));

  // زوجات عبر الأبناء دون رابط مسجّل مسبقاً في الحواف
  for (const sp of inLawSpousesOf(rootPersonId)) {
    if (rootSpouseIds.includes(sp.id)) continue;
    if (!positions.has(sp.id)) {
      placeAt(sp.id, 90, 0, { isSpouse: true, spouseIndex: rootSpouseIds.length });
      spouseEdges.push({ fromId: rootPersonId, toId: sp.id });
    } else if (!positions.get(sp.id)!.isSpouse && bloodline.has(sp.id)) {
      // موجودة كدم — لا نُحوّلها؛ تُحسب زوجة عبر الخط فقط
      continue;
    } else {
      positions.set(sp.id, { ...positions.get(sp.id)!, isSpouse: true });
      if (!spouseEdges.some((e) => (e.fromId === rootPersonId && e.toId === sp.id) || (e.toId === rootPersonId && e.fromId === sp.id))) {
        spouseEdges.push({ fromId: rootPersonId, toId: sp.id });
      }
    }
    rootSpouseIds.push(sp.id);
  }

  {
    const n = rootSpouseIds.length;
    const spreadDeg = Math.min(110, Math.max(40, n * 30));
    const radiusPct = Math.min(15, 10 + n * 0.9);
    rootSpouseIds.forEach((sid, i) => {
      const sp = positions.get(sid);
      if (!sp) return;
      const t = n === 1 ? 0.5 : i / (n - 1);
      const deg = 90 - spreadDeg / 2 + t * spreadDeg;
      const rad = (deg * Math.PI) / 180;
      positions.set(sid, {
        ...sp,
        x: cx + radiusPct * Math.cos(rad),
        y: cy + radiusPct * Math.sin(rad),
        angle: deg,
        ring: 0,
        isSpouse: true,
        radiusBias: 0,
        spouseIndex: i,
      });
    });
  }

  for (const [id, pos] of positions) {
    if (pos.ring === 0) continue;
    const bias = pos.radiusBias ?? 0;
    const radius = Math.max(4, (pos.ring + bias) * step);
    const rad = (pos.angle * Math.PI) / 180;
    positions.set(id, {
      ...pos,
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    });
  }

  // ضمان فصل إحداثي نهائي بين زوجات نفس الأصل على الحلقات
  const bloodIds = [...positions.entries()]
    .filter(([, p]) => !p.isSpouse)
    .map(([id]) => id);
  for (const bloodId of bloodIds) {
    if (bloodId === rootPersonId) continue;
    const blood = positions.get(bloodId)!;
    const spouseIds = spouseEdges
      .filter((e) => e.fromId === bloodId || e.toId === bloodId)
      .map((e) => (e.fromId === bloodId ? e.toId : e.fromId))
      .filter((sid) => positions.get(sid)?.isSpouse);
    if (spouseIds.length <= 1) continue;

    const br = Math.hypot(blood.x - cx, blood.y - cy);
    const spouseR = Math.max(4, br * 0.78);
    const baseAng = Math.atan2(blood.y - cy, blood.x - cx);
    const sep = Math.max(0.14, (4.8 / Math.max(spouseR, 6)) ); // راديان تقريباً من قوس 4.8%
    spouseIds.forEach((sid, i) => {
      const sp = positions.get(sid)!;
      const a = baseAng + (i - (spouseIds.length - 1) / 2) * sep;
      positions.set(sid, {
        ...sp,
        x: cx + spouseR * Math.cos(a),
        y: cy + spouseR * Math.sin(a),
        angle: (a * 180) / Math.PI,
        spouseIndex: i,
        isSpouse: true,
        radiusBias: -0.4,
      });
    });
  }

  // روابط زواج بين فردين ظاهرين في الشجرة (مثل أبناء العم) — خط خفيف دون نقل أحدهما
  const linkedPairs = new Set(
    spouseEdges.map((e) => {
      const a = Math.min(e.fromId, e.toId);
      const b = Math.max(e.fromId, e.toId);
      return `${a}:${b}`;
    }),
  );
  const addMarriageLink = (idA: number, idB: number) => {
    if (idA === idB) return;
    if (!positions.has(idA) || !positions.has(idB)) return;
    const a = Math.min(idA, idB);
    const b = Math.max(idA, idB);
    const key = `${a}:${b}`;
    if (linkedPairs.has(key)) return;
    linkedPairs.add(key);
    spouseEdges.push({ fromId: a, toId: b });
    // علّم الطرفين إن كانا أصلي نسب (ليس قمراً صناعياً)
    for (const id of [a, b]) {
      const pos = positions.get(id)!;
      if (!pos.isSpouse) {
        positions.set(id, { ...pos, crossBranchSpouse: true });
      }
    }
  };
  for (const p of people) {
    if (!positions.has(p.id)) continue;
    for (const s of oppositeSpouses(p, spousesOf, byId)) {
      addMarriageLink(p.id, s.id);
    }
    // استنتاج من أبناء مشترَكين إن نقص رابط الزوجية
    for (const kid of bloodKids(p.id)) {
      const { fatherId, motherId } = getParents(kid, rels, byId);
      if (fatherId == null || motherId == null) continue;
      if (fatherId !== p.id && motherId !== p.id) continue;
      addMarriageLink(fatherId, motherId);
    }
  }

  return {
    positions,
    edges,
    spouseEdges,
    ringCount: maxRing + 1,
    rootIds: [rootPersonId],
  };
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
    const spouses = oppositeSpouses(head, spousesOf, byId);

    if (head.gender === "male") {
      father = head;
      mother = spouses[0] ?? null;
    } else {
      mother = head;
      father = spouses[0] ?? null;
    }

    // الأبناء تحت رأس الفرع إن كان الوالد المعتمد (الأب إن وُجد وإلا الأم)
    const childIds = [
      ...new Set([
        ...(father ? childrenOf.get(father.id) ?? [] : []),
        ...(mother ? childrenOf.get(mother.id) ?? [] : []),
        ...spouses.flatMap((s) => childrenOf.get(s.id) ?? []),
      ]),
    ].filter((id) => {
      if (!byId.has(id)) return false;
      return preferredParentId(id, rels, byId) === headId;
    });

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
        if ((levels.get(gid) ?? 0) > childLevel) {
          if (preferredParentId(gid, rels, byId) === child.id) {
            grandchildIds.add(gid);
          }
        }
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

/** تسمية سعف النخلة مع كل الزوجات */
export function formatPalmCoupleAll(
  head: Person,
  spouses: Person[],
): string {
  const parts = [personDisplayName(head), ...spouses.map(personDisplayName)];
  return parts.join(" · ");
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
  /** أزواج/زوجات من خارج خط النسب */
  inLawSpouses: number;
  /** أفراد مسجّلون كتوأم (مجموعة ≥ 2) */
  twins: number;
  byGeneration: PrintGenerationStats[];
};

/** نسل الدم من الجذر عبر روابط الأبناء فقط */
export function collectBloodlineIds(
  rootPersonId: number,
  people: Person[],
  rels: Relationship[],
  levels: Map<number, number>,
): Set<number> {
  const byId = new Map(people.map((p) => [p.id, p]));
  const bloodline = new Set<number>();
  if (!byId.has(rootPersonId)) return bloodline;

  const childrenOf = buildChildrenOf(rels);
  const spousesOf = buildSpousesOf(rels);
  const rootLevel = levels.get(rootPersonId) ?? 0;

  const bloodKids = (id: number): number[] => {
    const parentLvl = levels.get(id) ?? rootLevel;
    const seen = new Set<number>();
    const out: number[] = [];
    for (const cid of familyChildrenOf(id, childrenOf, spousesOf, rels, byId)) {
      if (!byId.has(cid) || seen.has(cid)) continue;
      const childLvl = levels.get(cid);
      if (childLvl !== undefined && childLvl < parentLvl) continue;
      seen.add(cid);
      out.push(cid);
    }
    return out;
  };

  bloodline.add(rootPersonId);
  const q = [rootPersonId];
  while (q.length > 0) {
    const id = q.shift()!;
    for (const kid of bloodKids(id)) {
      if (bloodline.has(kid)) continue;
      bloodline.add(kid);
      q.push(kid);
    }
  }
  return bloodline;
}

export function computePrintStats(
  people: Person[],
  levels: Map<number, number>,
  rels?: Relationship[],
  opts?: { rootPersonId?: number },
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
  let twins = 0;

  for (const p of people) {
    if (p.gender === "female") females++;
    else males++;
    if (isPersonLiving(p)) living++;
    else deceased++;
    if (twinGroupSize(p, people) >= 2) twins++;
  }

  let inLawSpouses = 0;
  if (rels && opts?.rootPersonId != null && byId.has(opts.rootPersonId)) {
    const bloodline = collectBloodlineIds(
      opts.rootPersonId,
      people,
      rels,
      effectiveLevels,
    );
    const spousesOf = buildSpousesOf(rels);
    const counted = new Set<number>();
    for (const bloodId of bloodline) {
      for (const sid of spousesOf.get(bloodId) ?? []) {
        if (!byId.has(sid) || bloodline.has(sid) || counted.has(sid)) continue;
        counted.add(sid);
        inLawSpouses++;
      }
    }
    // آباء/أمهات أبناء الدم من خارج النسب دون رابط زوجية مسجّل
    for (const kid of bloodline) {
      const { fatherId, motherId } = getParents(kid, rels, byId);
      for (const pid of [fatherId, motherId]) {
        if (pid == null || !byId.has(pid) || bloodline.has(pid) || counted.has(pid))
          continue;
        const other = fatherId === pid ? motherId : fatherId;
        if (other != null && bloodline.has(other)) {
          counted.add(pid);
          inLawSpouses++;
        }
      }
    }
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
    inLawSpouses,
    twins,
    byGeneration,
  };
}
