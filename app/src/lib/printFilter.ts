import type { Person, Relationship } from "@db/schema";
import type { TreeBranch } from "@db/tables";
import type { FemaleDisplay } from "@contracts/constants";
import {
  assignGenerationsFromPrintRoot,
  firstGivenName,
  personDisplayName,
} from "@/lib/printData";
import {
  buildChildrenOf,
  buildSpousesOf,
  familyChildrenOf,
} from "@/lib/familyGraph";

/** خيارات نطاق الطباعة */
export type PrintPaperSize =
  | "A4-landscape"
  | "A3-landscape"
  | "A4-portrait"
  | "A3-portrait";

export type PrintNameMode = "full" | "firstOnly";

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
  /** أسلوب الاسم للجميع في المخطط */
  nameMode: PrintNameMode;
  /** حجم ورقة الطباعة */
  paperSize: PrintPaperSize;
};

export const DEFAULT_PRINT_SCOPE: PrintScope = {
  rootPersonId: null,
  branchId: null,
  generationsDown: 10,
  includeParents: false,
  includeSpouses: true,
  includeSpouseLineage: false,
  femaleDisplay: "full",
  nameMode: "full",
  paperSize: "A4-landscape",
};

export const PRINT_PAPER_SIZES: Record<
  PrintPaperSize,
  {
    css: string;
    margin: string;
    chartMax: string;
    labelKey: string;
    widthMm: number;
    heightMm: number;
  }
> = {
  "A4-landscape": {
    css: "297mm 210mm",
    margin: "5mm",
    chartMax: "188mm",
    labelKey: "printPage.paperA4Landscape",
    widthMm: 297,
    heightMm: 210,
  },
  "A3-landscape": {
    css: "420mm 297mm",
    margin: "6mm",
    chartMax: "270mm",
    labelKey: "printPage.paperA3Landscape",
    widthMm: 420,
    heightMm: 297,
  },
  "A4-portrait": {
    css: "210mm 297mm",
    margin: "6mm",
    chartMax: "185mm",
    labelKey: "printPage.paperA4Portrait",
    widthMm: 210,
    heightMm: 297,
  },
  "A3-portrait": {
    css: "297mm 420mm",
    margin: "6mm",
    chartMax: "270mm",
    labelKey: "printPage.paperA3Portrait",
    widthMm: 297,
    heightMm: 420,
  },
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

/** الاسم الأول فقط للجميع — يزيل النسب واللقب ويُبقي المقطع الأول من الاسم */
export function applyNameMode(people: Person[], mode: PrintNameMode): Person[] {
  if (mode === "full") return people;
  return people.map((p) => ({
    ...p,
    givenName: firstGivenName(p.givenName),
    fatherName: null,
    kunya: null,
    laqab: null,
  }));
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

  const included = new Set<number>([rootId]);
  const depthOf = new Map<number, number>([[rootId, 0]]);
  const byIdLocal = byId;

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

  // نسل الجذر بعمق BFS (لا بمستوى الشجرة الكلية — كان يقطع فروعاً)
  const maxDepth = Math.max(0, scope.generationsDown - 1);
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const depth = depthOf.get(id) ?? 0;
    if (depth >= maxDepth) continue;

    const kids = familyChildrenOf(
      id,
      childrenOf,
      spousesOf,
      allRels,
      byIdLocal,
      { includeSpouseLineage: scope.includeSpouseLineage },
    );

    for (const kid of kids) {
      if (!byId.has(kid)) continue;
      if (!personMatchesBranch(kid, scope.branchId, branches, byId, childrenOf)) {
        continue;
      }
      const nextDepth = depth + 1;
      const prev = depthOf.get(kid);
      if (prev !== undefined && prev <= nextDepth) continue;
      included.add(kid);
      depthOf.set(kid, nextDepth);
      queue.push(kid);
    }
  }

  // أزواج المشمولين (+ عائلة الزوج إن طُلب)
  if (scope.includeSpouses) {
    for (const id of [...included]) {
      for (const sid of spousesOf.get(id) ?? []) {
        if (!byId.has(sid)) continue;
        included.add(sid);
        if (!scope.includeSpouseLineage) continue;

        for (const r of allRels) {
          if (r.type !== "parent" || r.toPersonId !== sid) continue;
          const pid = r.fromPersonId;
          if (
            byId.has(pid) &&
            personMatchesBranch(pid, scope.branchId, branches, byId, childrenOf)
          ) {
            included.add(pid);
          }
        }

        // أبناء إضافيون من نسب الزوج خارج الخط — بعمق محدود
        const baseDepth = depthOf.get(id) ?? 0;
        const spouseQueue: number[] = [];
        for (const kid of childrenOf.get(sid) ?? []) {
          if (!byId.has(kid) || included.has(kid)) continue;
          if (!personMatchesBranch(kid, scope.branchId, branches, byId, childrenOf)) {
            continue;
          }
          const nextDepth = baseDepth + 1;
          if (nextDepth > maxDepth) continue;
          included.add(kid);
          depthOf.set(kid, nextDepth);
          spouseQueue.push(kid);
        }
        while (spouseQueue.length > 0) {
          const qid = spouseQueue.shift()!;
          const depth = depthOf.get(qid) ?? 0;
          if (depth >= maxDepth) continue;
          for (const kid of familyChildrenOf(
            qid,
            childrenOf,
            spousesOf,
            allRels,
            byIdLocal,
            { includeSpouseLineage: true },
          )) {
            if (!byId.has(kid)) continue;
            if (
              !personMatchesBranch(kid, scope.branchId, branches, byId, childrenOf)
            ) {
              continue;
            }
            const nextDepth = depth + 1;
            if (nextDepth > maxDepth) continue;
            const prev = depthOf.get(kid);
            if (prev !== undefined && prev <= nextDepth) continue;
            included.add(kid);
            depthOf.set(kid, nextDepth);
            spouseQueue.push(kid);
          }
        }
      }
    }
  }

  let people = allPeople.filter((p) => included.has(p.id));
  people = applyFemaleDisplay(people, scope.femaleDisplay);
  people = applyNameMode(people, scope.nameMode);
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
