import { and, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import { persons, subscriptionPlans, treeMembers, trees, users } from "@db/tables";
import type { SubscriptionPlan } from "@contracts/constants";
import { ensurePlatformDefaults } from "./seedDefaults";

export type PlanLimits = {
  slug: SubscriptionPlan;
  nameAr: string;
  nameEn: string;
  maxTrees: number | null;
  maxPersonsPerTree: number | null;
  maxPersonsTotal: number | null;
  priceYearly: number;
  periodDays: number;
  renewalDiscountPercent: number;
  includesPrint: boolean;
  requiresPayment: boolean;
  isActive: boolean;
};

function fmtLimit(n: number | null): string {
  return n == null ? "∞" : String(n);
}

export async function getPlanLimits(slug: SubscriptionPlan): Promise<PlanLimits> {
  await ensurePlatformDefaults();
  const db = getDb();
  const row = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.slug, slug))
    .then((r) => r[0]);

  if (!row) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "خطة غير معرّفة" });
  }

  return {
    slug: row.slug as SubscriptionPlan,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    maxTrees: row.maxTrees,
    maxPersonsPerTree: row.maxPersonsPerTree,
    maxPersonsTotal: row.maxPersonsTotal,
    priceYearly: row.priceYearly,
    periodDays: row.periodDays ?? 365,
    renewalDiscountPercent: row.renewalDiscountPercent ?? 0,
    includesPrint: row.includesPrint,
    requiresPayment: row.requiresPayment,
    isActive: row.isActive,
  };
}

export async function getUserPlanLimits(userId: number): Promise<PlanLimits> {
  const db = getDb();
  const user = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .then((r) => r[0]);
  if (!user) {
    throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
  }
  return getPlanLimits((user.plan ?? "free") as SubscriptionPlan);
}

async function countOwnedTrees(userId: number): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: trees.id })
    .from(trees)
    .where(eq(trees.ownerId, userId));
  return rows.length;
}

async function countPersonsInTree(treeId: number): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: persons.id })
    .from(persons)
    .where(and(eq(persons.treeId, treeId), isNull(persons.deletedAt)));
  return rows.length;
}

async function countTotalPersonsForOwner(userId: number): Promise<number> {
  const db = getDb();
  const owned = await db
    .select({ id: trees.id })
    .from(trees)
    .where(eq(trees.ownerId, userId));
  if (owned.length === 0) return 0;
  const treeIds = owned.map((t) => t.id);
  const rows = await db
    .select({ id: persons.id })
    .from(persons)
    .where(and(inArray(persons.treeId, treeIds), isNull(persons.deletedAt)));
  return rows.length;
}

export async function assertCanCreateTree(userId: number) {
  const limits = await getUserPlanLimits(userId);
  if (!limits.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "خطتك غير نشطة — تواصل مع الدعم",
    });
  }
  if (limits.maxTrees == null) return limits;
  const owned = await countOwnedTrees(userId);
  if (owned >= limits.maxTrees) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `وصلت حد الأشجار لخطتك (${fmtLimit(limits.maxTrees)}). رقِّ خطتك لإنشاء المزيد.`,
    });
  }
  return limits;
}

export async function assertCanAddPerson(ownerId: number, treeId: number, addCount = 1) {
  const limits = await getUserPlanLimits(ownerId);
  if (!limits.isActive) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "خطتك غير نشطة — تواصل مع الدعم",
    });
  }

  if (limits.maxPersonsPerTree != null) {
    const inTree = await countPersonsInTree(treeId);
    if (inTree + addCount > limits.maxPersonsPerTree) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `وصلت حد الأفراد في هذه الشجرة (${fmtLimit(limits.maxPersonsPerTree)}). رقِّ خطتك أو أنشئ شجرة أخرى.`,
      });
    }
  }

  if (limits.maxPersonsTotal != null) {
    const total = await countTotalPersonsForOwner(ownerId);
    if (total + addCount > limits.maxPersonsTotal) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `وصلت حد الأفراد الإجمالي لخطتك (${fmtLimit(limits.maxPersonsTotal)}). رقِّ خطتك للمتابعة.`,
      });
    }
  }

  return limits;
}

export async function getOwnerUsage(userId: number) {
  const limits = await getUserPlanLimits(userId);
  const ownedTrees = await countOwnedTrees(userId);
  const totalPersons = await countTotalPersonsForOwner(userId);

  const db = getDb();
  const memberships = await db
    .select({ treeId: treeMembers.treeId })
    .from(treeMembers)
    .where(eq(treeMembers.userId, userId));
  const treeIds = memberships.map((m) => m.treeId);
  let sharedTrees = 0;
  if (treeIds.length > 0) {
    const treeRows = await db
      .select({ ownerId: trees.ownerId })
      .from(trees)
      .where(inArray(trees.id, treeIds));
    sharedTrees = treeRows.filter((t) => t.ownerId !== userId).length;
  }

  return {
    limits,
    ownedTrees,
    sharedTrees,
    totalPersons,
  };
}
