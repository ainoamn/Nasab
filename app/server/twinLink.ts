import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { Person, Relationship } from "@db/schema";
import { persons } from "@db/tables";
import { getDb } from "./queries/connection";

type Db = ReturnType<typeof getDb>;

function parentsOf(
  childId: number,
  rels: Relationship[],
  byId: Map<number, Person>,
): { fatherId: number | null; motherId: number | null } {
  const fathers: number[] = [];
  const mothers: number[] = [];
  for (const r of rels) {
    if (r.type !== "parent" || r.toPersonId !== childId) continue;
    const p = byId.get(r.fromPersonId);
    if (!p) continue;
    if (p.gender === "female") mothers.push(r.fromPersonId);
    else fathers.push(r.fromPersonId);
  }
  return { fatherId: fathers[0] ?? null, motherId: mothers[0] ?? null };
}

/** التوأم يجب أن يكونا أشقاء من نفس الأب ونفس الأم */
export function assertSameParents(
  aId: number,
  bId: number,
  rels: Relationship[],
  people: Person[],
): void {
  if (aId === bId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "لا يمكن ربط الشخص بنفسه كتوأم",
    });
  }
  const byId = new Map(people.map((p) => [p.id, p]));
  const a = parentsOf(aId, rels, byId);
  const b = parentsOf(bId, rels, byId);
  if (!a.fatherId || !a.motherId || !b.fatherId || !b.motherId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "لتسجيل التوأم يجب أن يكون للأبوين (الأب والأم) مسجّلين لكلا الشخصين",
    });
  }
  if (a.fatherId !== b.fatherId || a.motherId !== b.motherId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "التوأم يجب أن يكونا إخوة أشقاء من نفس الأب ونفس الأم",
    });
  }
}

/** @deprecated استخدم assertSameParents */
export function assertShareFather(
  aId: number,
  bId: number,
  rels: Relationship[],
  people: Person[],
): void {
  assertSameParents(aId, bId, rels, people);
}

async function nextTwinGroupId(db: Db, treeId: number): Promise<number> {
  const row = await db
    .select({ maxId: sql<number>`max(${persons.twinGroupId})` })
    .from(persons)
    .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)));
  return (row[0]?.maxId ?? 0) + 1;
}

/** يطبّق مجموعات التوائم بعد استيراد GEDCOM (مفاتيح نصية → أرقام داخل الشجرة) */
export async function applyImportedTwinGroups(
  db: Db,
  treeId: number,
  entries: Array<{ personId: number; twinGroupKey: string }>,
): Promise<number> {
  const byKey = new Map<string, number[]>();
  for (const e of entries) {
    const k = e.twinGroupKey.trim();
    if (!k) continue;
    const list = byKey.get(k) ?? [];
    list.push(e.personId);
    byKey.set(k, list);
  }
  let groups = 0;
  let next = await nextTwinGroupId(db, treeId);
  for (const ids of byKey.values()) {
    const unique = [...new Set(ids)];
    if (unique.length < 2) continue;
    for (const personId of unique) {
      await db
        .update(persons)
        .set({ twinGroupId: next })
        .where(
          and(
            eq(persons.id, personId),
            eq(persons.treeId, treeId),
            isNull(persons.deletedAt),
          ),
        );
    }
    next += 1;
    groups += 1;
  }
  return groups;
}

/** يربط شخصاً بتوأم موجود — يُنشئ مجموعة جديدة إن لزم */
export async function assignTwinOf(
  db: Db,
  treeId: number,
  personId: number,
  twinOfPersonId: number,
  rels: Relationship[],
  people: Person[],
): Promise<void> {
  assertSameParents(personId, twinOfPersonId, rels, people);

  const twin = await db.query.persons.findFirst({
    where: and(
      eq(persons.id, twinOfPersonId),
      eq(persons.treeId, treeId),
      isNull(persons.deletedAt),
    ),
  });
  if (!twin) {
    throw new TRPCError({ code: "NOT_FOUND", message: "التوأم غير موجود" });
  }

  let groupId = twin.twinGroupId ?? null;
  if (!groupId) {
    groupId = await nextTwinGroupId(db, treeId);
    await db
      .update(persons)
      .set({ twinGroupId: groupId })
      .where(and(eq(persons.id, twinOfPersonId), eq(persons.treeId, treeId)));
  }

  await db
    .update(persons)
    .set({ twinGroupId: groupId })
    .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)));
}

/** يزيل الشخص من مجموعة التوأم — ويُفكّ المجموعة إن بقي فرد واحد */
export async function clearTwinGroup(
  db: Db,
  treeId: number,
  personId: number,
): Promise<void> {
  const person = await db.query.persons.findFirst({
    where: and(
      eq(persons.id, personId),
      eq(persons.treeId, treeId),
      isNull(persons.deletedAt),
    ),
  });
  if (!person?.twinGroupId) return;

  const groupId = person.twinGroupId;
  await db
    .update(persons)
    .set({ twinGroupId: null })
    .where(and(eq(persons.id, personId), eq(persons.treeId, treeId)));

  const remaining = await db
    .select({ id: persons.id })
    .from(persons)
    .where(
      and(
        eq(persons.treeId, treeId),
        eq(persons.twinGroupId, groupId),
        isNull(persons.deletedAt),
      ),
    );

  if (remaining.length === 1) {
    await db
      .update(persons)
      .set({ twinGroupId: null })
      .where(
        and(eq(persons.id, remaining[0]!.id), eq(persons.treeId, treeId)),
      );
  }
}
