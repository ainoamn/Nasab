import { and, eq, isNull, or } from "drizzle-orm";
import type { getDb } from "./queries/connection";

type Db = ReturnType<typeof getDb>;
import { persons, relationships, treeBranches } from "@db/tables";
import { insertReturningId } from "./queries/insert-id";
import {
  lineageAncestorsToCreate,
  namesMatch,
  normalizeArabicName,
  parseLineageChain,
  personMatchesLineage,
} from "@/lib/lineageParser";

export type LineageMatch = {
  personId: number;
  givenName: string;
  fatherName: string | null;
  score: number;
  branchId: number | null;
  /** نفس الشخص أو أخ/أخت بنفس سلسلة الأب */
  kind?: "same_person" | "sibling";
};

function lineageTextMatches(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  const pa = parseLineageChain(a);
  const pb = parseLineageChain(b);
  if (pa.segments.length === 0 || pb.segments.length === 0) {
    const na = normalizeArabicName(a);
    const nb = normalizeArabicName(b);
    return na.includes(nb) || nb.includes(na);
  }
  const minLen = Math.min(pa.segments.length, pb.segments.length);
  for (let i = 0; i < minLen; i++) {
    if (!namesMatch(pa.segments[i].givenName, pb.segments[i].givenName)) {
      return false;
    }
  }
  return true;
}

/** بحث عن أشخاص مشابهين بالاسم والنسب — أو إخوة بنفس سلسلة الأب */
export async function searchSimilarPersons(
  db: Db,
  treeId: number,
  givenName: string,
  fatherNameLine: string | null | undefined,
  excludeId?: number,
): Promise<LineageMatch[]> {
  const all = await db
    .select()
    .from(persons)
    .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)));

  const matches: LineageMatch[] = [];
  const targetLine = fatherNameLine?.trim() ?? "";

  for (const p of all) {
    if (excludeId && p.id === excludeId) continue;

    if (namesMatch(p.givenName, givenName)) {
      let score = 50;
      if (targetLine && p.fatherName) {
        if (
          personMatchesLineage(p.givenName, p.fatherName, givenName, targetLine)
        ) {
          score = 100;
        } else if (lineageTextMatches(p.fatherName, targetLine)) {
          score = 75;
        }
      } else if (!targetLine && !p.fatherName) {
        score = 60;
      }

      if (score >= 50) {
        matches.push({
          personId: p.id,
          givenName: p.givenName,
          fatherName: p.fatherName,
          score,
          branchId: p.branchId ?? null,
          kind: "same_person",
        });
      }
      continue;
    }

    if (targetLine && p.fatherName && lineageTextMatches(p.fatherName, targetLine)) {
      matches.push({
        personId: p.id,
        givenName: p.givenName,
        fatherName: p.fatherName,
        score: 70,
        branchId: p.branchId ?? null,
        kind: "sibling",
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

async function getExistingPeople(db: Db, treeId: number) {
  return db
    .select()
    .from(persons)
    .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)));
}

/** إيجاد سلف موجود بنفس الاسم وسلسلة النسب */
function findExistingAncestor(
  anc: { givenName: string; fatherNameLine: string },
  existing: Awaited<ReturnType<typeof getExistingPeople>>,
): (typeof existing)[number] | null {
  const sameName = existing.filter((p) => namesMatch(p.givenName, anc.givenName));

  for (const p of sameName) {
    if (!anc.fatherNameLine) {
      if (!p.fatherName?.trim()) return p;
      continue;
    }
    if (p.fatherName && lineageTextMatches(p.fatherName, anc.fatherNameLine)) {
      return p;
    }
  }

  // شخص بلا نسب لكنه يظهر كأول اسم في نسب أشخاص موجودين مطابقة للسلسلة
  for (const p of sameName) {
    if (p.fatherName?.trim() && anc.fatherNameLine) continue;
    const restNames = anc.fatherNameLine
      ? parseLineageChain(anc.fatherNameLine).segments.map((s) => s.givenName)
      : [];
    const childWithLine = existing.find((c) => {
      if (!c.fatherName?.trim()) return false;
      const segs = parseLineageChain(c.fatherName).segments;
      if (segs.length === 0) return false;
      if (!namesMatch(segs[0].givenName, anc.givenName)) return false;
      if (restNames.length === 0) return true;
      if (segs.length < restNames.length + 1) return false;
      return restNames.every(
        (name, idx) =>
          segs[idx + 1] && namesMatch(segs[idx + 1].givenName, name),
      );
    });
    if (childWithLine) return p;
  }

  if (!anc.fatherNameLine) {
    return sameName.find((p) => !p.fatherName?.trim()) ?? null;
  }

  return null;
}

/** إنشاء سلسلة آباء + فرع — يعيد استخدام الموجود بدل التكرار */
export async function ensureBranchFromLineage(
  db: Db,
  treeId: number,
  userId: number,
  fatherNameLine: string,
  clan?: string | null,
): Promise<{ branchId: number; directFatherId: number | null }> {
  const ancestors = lineageAncestorsToCreate(fatherNameLine, "male");
  if (ancestors.length === 0) {
    return { branchId: 0, directFatherId: null };
  }

  let existing = await getExistingPeople(db, treeId);
  const resolvedIds: number[] = [];
  let branchId: number | null = null;

  for (let i = 0; i < ancestors.length; i++) {
    const anc = ancestors[i];
    let found = findExistingAncestor(anc, existing);

    if (found) {
      resolvedIds.push(found.id);
      if (found.branchId && !branchId) branchId = found.branchId;
      if (anc.fatherNameLine && !found.fatherName?.trim()) {
        await db
          .update(persons)
          .set({ fatherName: anc.fatherNameLine })
          .where(eq(persons.id, found.id));
        found = { ...found, fatherName: anc.fatherNameLine };
      }
    } else {
      const personId = await insertReturningId(persons, {
        treeId,
        givenName: anc.givenName,
        fatherName: anc.fatherNameLine || null,
        gender: "male",
        clan: i === 0 ? (clan ?? null) : null,
        isLiving: true,
        privacy: "family",
        branchId: branchId ?? undefined,
        createdById: userId,
      });
      resolvedIds.push(personId);
      existing = await getExistingPeople(db, treeId);
    }
  }

  for (let i = 0; i < resolvedIds.length - 1; i++) {
    const childId = resolvedIds[i];
    const parentId = resolvedIds[i + 1];
    if (childId === parentId) continue;
    const relExists = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          eq(relationships.fromPersonId, parentId),
          eq(relationships.toPersonId, childId),
          eq(relationships.type, "parent"),
        ),
      );
    if (relExists.length === 0) {
      await db.insert(relationships).values({
        treeId,
        fromPersonId: parentId,
        toPersonId: childId,
        type: "parent",
      });
    }
  }

  const directFatherId = resolvedIds[0] ?? null;
  const topAncestorId = resolvedIds[resolvedIds.length - 1] ?? null;

  if (!branchId && topAncestorId) {
    const existingBranches = await db
      .select()
      .from(treeBranches)
      .where(eq(treeBranches.treeId, treeId));
    const reuse = existingBranches.find((b) =>
      resolvedIds.includes(b.rootPersonId),
    );
    if (reuse) {
      branchId = reuse.id;
      // يبقى الفرع مخفياً من العرض المكدّس — يُفتح عبر مؤشر الدائرة
    } else {
      const rootName = ancestors[ancestors.length - 1].givenName;
      const parsed = parseLineageChain(fatherNameLine);
      const branchLabel =
        parsed.segments.length > 1
          ? `${rootName} ${parsed.segments
              .slice(1)
              .map((s) => s.givenName)
              .join(" ")}`
          : `فرع ${rootName}`;

      branchId = await insertReturningId(treeBranches, {
        treeId,
        name: branchLabel.trim(),
        rootPersonId: topAncestorId,
        isHidden: true,
      });
    }
  }

  if (branchId) {
    existing = await getExistingPeople(db, treeId);
    for (const pid of resolvedIds) {
      const p = existing.find((x) => x.id === pid);
      if (p && !p.branchId) {
        await db
          .update(persons)
          .set({ branchId })
          .where(eq(persons.id, pid));
      }
    }
  }

  return { branchId: branchId ?? 0, directFatherId };
}

/**
 * يربط كل من يحمل نفس سلسلة النسب بنفس الأب المباشر
 * (مثلاً رحمة وفاطمة «بنت سالم بن سلمان» → نفس سالم)
 */
export async function linkSiblingsToFather(
  db: Db,
  treeId: number,
  fatherId: number,
  childLineage: string,
  excludeChildId?: number,
): Promise<number> {
  const all = await getExistingPeople(db, treeId);
  const father = all.find((p) => p.id === fatherId);
  if (!father) return 0;

  let linked = 0;
  for (const p of all) {
    if (p.id === fatherId || p.id === excludeChildId) continue;
    if (!p.fatherName?.trim()) continue;
    if (!lineageTextMatches(p.fatherName, childLineage)) continue;

    const segs = parseLineageChain(p.fatherName).segments;
    if (segs.length === 0 || !namesMatch(segs[0].givenName, father.givenName)) {
      continue;
    }

    const exists = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          eq(relationships.fromPersonId, fatherId),
          eq(relationships.toPersonId, p.id),
          eq(relationships.type, "parent"),
        ),
      );
    if (exists.length > 0) continue;

    const otherParents = await db
      .select()
      .from(relationships)
      .where(
        and(
          eq(relationships.treeId, treeId),
          eq(relationships.toPersonId, p.id),
          eq(relationships.type, "parent"),
        ),
      );
    let hasMaleFather = false;
    for (const r of otherParents) {
      const parent = all.find((x) => x.id === r.fromPersonId);
      if (parent?.gender === "male") {
        hasMaleFather = true;
        break;
      }
    }
    if (hasMaleFather) continue;

    await db.insert(relationships).values({
      treeId,
      fromPersonId: fatherId,
      toPersonId: p.id,
      type: "parent",
    });
    if (father.branchId && !p.branchId) {
      await db
        .update(persons)
        .set({ branchId: father.branchId })
        .where(eq(persons.id, p.id));
    }
    linked++;
  }
  return linked;
}

/** عند إضافة ابن/بنت من الأم: يستخرج الأب من النسب أو يُنشئه ويربطه كزوج */
export async function resolveFatherForMotherChild(
  db: Db,
  treeId: number,
  userId: number,
  motherId: number,
  childLineage: string,
  clan?: string | null,
): Promise<number | null> {
  const parsed = parseLineageChain(childLineage.trim());
  const directFatherGiven = parsed.segments[0]?.givenName;
  if (!directFatherGiven) return null;

  const spouseRels = await db
    .select()
    .from(relationships)
    .where(
      and(
        eq(relationships.treeId, treeId),
        eq(relationships.type, "spouse"),
        or(
          eq(relationships.fromPersonId, motherId),
          eq(relationships.toPersonId, motherId),
        ),
      ),
    );

  const allPeople = await db
    .select()
    .from(persons)
    .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)));
  const byId = new Map(allPeople.map((p) => [p.id, p]));

  for (const sr of spouseRels) {
    const sid =
      sr.fromPersonId === motherId ? sr.toPersonId : sr.fromPersonId;
    const sp = byId.get(sid);
    if (sp?.gender === "male" && namesMatch(sp.givenName, directFatherGiven)) {
      return sid;
    }
  }

  const branch = await ensureBranchFromLineage(
    db,
    treeId,
    userId,
    childLineage.trim(),
    clan,
  );
  const fatherId = branch.directFatherId;
  if (!fatherId) return null;

  const spouseExists = spouseRels.some(
    (sr) => sr.fromPersonId === fatherId || sr.toPersonId === fatherId,
  );
  if (!spouseExists) {
    await db.insert(relationships).values({
      treeId,
      fromPersonId: motherId,
      toPersonId: fatherId,
      type: "spouse",
    });
  }

  // الفرع يبقى مخفياً من العرض المكدّس؛ الأشخاص المرتبطون بالشجرة الرئيسية يظهرون عبر صلة الزوجية
  return fatherId;
}
