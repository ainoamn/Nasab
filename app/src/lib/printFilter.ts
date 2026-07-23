import type { Person, Relationship } from "@db/schema";
import type { TreeBranch } from "@db/tables";
import type { FemaleDisplay } from "@contracts/constants";
import {
  assignGenerationsStable,
  assignGenerationsFromPrintRoot,
  personDisplayName,
} from "@/lib/printData";

/** خيارات نطاق الطباعة */
export type PrintScope = {
  /** الجد الأعلى للمخرَج — الجيل 0 */
  rootPersonId: number | null;
  /** فرع النسب (null = الشجرة كاملة / الخط الرئيسي) */
  branchId: number | null;
  /** عدد الأجيال من الجذر للأسفل (1 = الجذر فقط) */
  generationsDown: number;
  /** تضمين آباء الجذر (جيل واحد للأعلى) — للسياق في المخطط */
  includeParents: boolean;
  /** إظهار أسماء الزوجات بجانب أزواجهن */
  includeSpouses: boolean;
  /** إظهار عائلة الزوجة (أبوها، إخوتها…) — عادةً لا */
  includeSpouseLineage: boolean;
  /** عرض الإناث */
  femaleDisplay: FemaleDisplay;
};

export const DEFAULT_PRINT_SCOPE: PrintScope = {
  rootPersonId: null,
  branchId: null,
  generationsDown: 6,
  includeParents: false,
  includeSpouses: true,
  includeSpouseLineage: false,
  femaleDisplay: "full",
};

export type PrintSubgraph = {
  people: Person[];
  rels: Relationship[];
  /** جيل 0 = rootPersonId */
  levels: Map<number, number>;
  rootPersonId: number;
};

function isDescendantOf(
  personId: number,
  ancestorId: number,
  childrenOf: Map<number, number[]>,
): boolean {
  const queue = [ancestorId];
  const seen = new Set<number>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (id === personId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const kid of childrenOf.get(id) ?? []) queue.push(kid);
  }
  return false;
}

function personMatchesBranch(
  personId: number,
  branchId: number | null,
  branches: TreeBranch[],
  byId: Map<number, Person>,
  childrenOf: Map<number, number[]>,
): boolean {
  if (!branchId) return true;
  const p = byId.get(personId);
  const branch = branches.find((b) => b.id === branchId);
  if (!p || !branch) return true;
  if (p.branchId === branchId) return true;
  if (p.branchId != null && p.branchId !== branchId) return false;
  return isDescendantOf(personId, branch.rootPersonId, childrenOf);
}

function applyFemaleDisplay(people: Person[], mode: FemaleDisplay): Person[] {
  if (mode === "full") return people;
  if (mode === "hidden") {
    return people.filter((p) => p.gender !== "female");
  }
  return people.map((p) =>
    p.gender === "female" ? { ...p, fatherName: null, kunya: null } : p,
  );
}

/** بناء subgraph للطباعة مع جيل 0 عند الجذر المختار */
export function buildPrintSubgraph(
  allPeople: Person[],
  allRels: Relationship[],
  branches: TreeBranch[],
  scope: PrintScope,
): PrintSubgraph {
  const byId = new Map(allPeople.map((p) => [p.id, p]));
  const childrenOf = new Map<number, number[]>();
  const spousesOf = new Map<number, number[]>();

  for (const r of allRels) {
    if (r.type === "parent") {
      const kids = childrenOf.get(r.fromPersonId) ?? [];
      if (!kids.includes(r.toPersonId)) kids.push(r.toPersonId);
      childrenOf.set(r.fromPersonId, kids);
    } else if (r.type === "spouse") {
      for (const [a, b] of [
        [r.fromPersonId, r.toPersonId],
        [r.toPersonId, r.fromPersonId],
      ] as const) {
        const arr = spousesOf.get(a) ?? [];
        if (!arr.includes(b)) arr.push(b);
        spousesOf.set(a, arr);
      }
    }
  }

  let rootId = scope.rootPersonId;
  if (!rootId && scope.branchId) {
    rootId = branches.find((b) => b.id === scope.branchId)?.rootPersonId ?? null;
  }
  if (!rootId) {
    const hasParent = new Set<number>();
    for (const r of allRels) {
      if (r.type === "parent") hasParent.add(r.toPersonId);
    }
    const roots = allPeople.filter((p) => !hasParent.has(p.id));
    rootId = roots[0]?.id ?? allPeople[0]?.id ?? null;
  }
  if (!rootId || !byId.has(rootId)) {
    return { people: [], rels: [], levels: new Map(), rootPersonId: rootId ?? 0 };
  }

  const stableLevels = assignGenerationsStable(allPeople, allRels);
  const rootStableGen = stableLevels.get(rootId) ?? 0;

  const included = new Set<number>([rootId]);

  // آباء الجذر مباشرة (جيل واحد للأعلى) — اختياري
  if (scope.includeParents) {
    for (const r of allRels) {
      if (r.type !== "parent" || r.toPersonId !== rootId) continue;
      const pid = r.fromPersonId;
      if (!byId.has(pid)) continue;
      if (!personMatchesBranch(pid, scope.branchId, branches, byId, childrenOf)) continue;
      included.add(pid);
    }
  }

  // أحفاد حتى generationsDown
  const maxRelativeGen = scope.generationsDown - 1;
  const walkDown = (id: number) => {
    for (const kid of childrenOf.get(id) ?? []) {
      if (!byId.has(kid) || included.has(kid)) continue;
      if (!personMatchesBranch(kid, scope.branchId, branches, byId, childrenOf)) continue;
      const relGen = (stableLevels.get(kid) ?? 0) - rootStableGen;
      if (relGen > maxRelativeGen) continue;
      included.add(kid);
      walkDown(kid);
    }
  };
  walkDown(rootId);

  // أزواج
  if (scope.includeSpouses) {
    for (const id of [...included]) {
      for (const sid of spousesOf.get(id) ?? []) {
        if (!byId.has(sid)) continue;
        included.add(sid);
        if (scope.includeSpouseLineage) {
          for (const r of allRels) {
            if (r.type !== "parent" || r.toPersonId !== sid) continue;
            const pid = r.fromPersonId;
            if (byId.has(pid) && personMatchesBranch(pid, scope.branchId, branches, byId, childrenOf)) {
              included.add(pid);
            }
          }
          walkDown(sid);
        }
      }
    }
  }

  let people = allPeople.filter((p) => included.has(p.id));
  people = applyFemaleDisplay(people, scope.femaleDisplay);
  const ids = new Set(people.map((p) => p.id));
  const rels = allRels.filter(
    (r) => ids.has(r.fromPersonId) && ids.has(r.toPersonId),
  );

  const levels = assignGenerationsFromPrintRoot(rootId, people, rels);

  return { people, rels, levels, rootPersonId: rootId };
}

export function scopeSummaryLabel(
  scope: PrintScope,
  root: Person | undefined,
  branch: TreeBranch | undefined,
  peopleCount: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const parts: string[] = [];
  if (branch) parts.push(t("printPage.scopeBranch", { name: branch.name }));
  else parts.push(t("printPage.scopeAllBranches"));
  if (root) parts.push(t("printPage.scopeRoot", { name: personDisplayName(root) }));
  parts.push(t("printPage.scopeGenerations", { count: scope.generationsDown }));
  parts.push(
    scope.includeSpouses
      ? t("printPage.scopeWithSpouses")
      : t("printPage.scopeNoSpouses"),
  );
  if (scope.includeSpouses && scope.includeSpouseLineage) {
    parts.push(t("printPage.scopeSpouseFamilies"));
  }
  parts.push(t("printPage.scopePersonCount", { count: peopleCount }));
  return parts.join(" · ");
}
