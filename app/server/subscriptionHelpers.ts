import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { users } from "@db/tables";
import type { SubscriptionPlan } from "@contracts/constants";
import { getPlanLimits } from "./planLimits";

export async function computePlanExpiry(
  planSlug: SubscriptionPlan,
  from = new Date(),
): Promise<{ startedAt: Date; expiresAt: Date | null }> {
  const limits = await getPlanLimits(planSlug);
  const startedAt = from;
  if (planSlug === "free" || limits.periodDays <= 0) {
    return { startedAt, expiresAt: null };
  }
  const expiresAt = new Date(startedAt);
  expiresAt.setDate(expiresAt.getDate() + limits.periodDays);
  return { startedAt, expiresAt };
}

export async function applySubscriptionPlan(
  userId: number,
  planSlug: SubscriptionPlan,
  opts?: { extendFromCurrent?: boolean },
) {
  const db = getDb();
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .then((r) => r[0]);
  if (!user) return;

  let base = new Date();
  if (
    opts?.extendFromCurrent &&
    user.planExpiresAt &&
    user.planExpiresAt > new Date()
  ) {
    base = user.planExpiresAt;
  }

  const { startedAt, expiresAt } = await computePlanExpiry(planSlug, base);

  await db
    .update(users)
    .set({
      plan: planSlug,
      planStartedAt: planSlug === "free" ? null : startedAt,
      planExpiresAt: expiresAt,
    })
    .where(eq(users.id, userId));
}

export async function rewardReferrer(referredUserId: number) {
  const db = getDb();
  const referred = await db
    .select()
    .from(users)
    .where(eq(users.id, referredUserId))
    .then((r) => r[0]);
  if (!referred?.referredByUserId) return;

  const referrer = await db
    .select()
    .from(users)
    .where(eq(users.id, referred.referredByUserId))
    .then((r) => r[0]);
  if (!referrer) return;

  const base =
    referrer.planExpiresAt && referrer.planExpiresAt > new Date()
      ? referrer.planExpiresAt
      : new Date();
  const extended = new Date(base);
  extended.setDate(extended.getDate() + 30);

  await db
    .update(users)
    .set({ planExpiresAt: extended })
    .where(eq(users.id, referrer.id));
}
