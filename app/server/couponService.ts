import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import { couponRedemptions, coupons, users } from "@db/tables";
import type { SubscriptionPlan } from "@contracts/constants";
import { generateReferralCode, nextSequence } from "./sequences";

export type CouponContext = "new" | "renewal";

export async function validateCoupon(
  code: string,
  userId: number,
  context: CouponContext,
  planSlug?: SubscriptionPlan,
) {
  const db = getDb();
  const normalized = code.trim().toUpperCase();
  const all = await db.select().from(coupons);
  const coupon = all.find((c) => c.code.toUpperCase() === normalized);

  if (!coupon || !coupon.isActive) {
    throw new TRPCError({ code: "NOT_FOUND", message: "كود الخصم غير صالح" });
  }

  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "كود الخصم لم يبدأ بعد" });
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "انتهت صلاحية كود الخصم" });
  }
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "استُنفد استخدام كود الخصم" });
  }

  if (coupon.appliesTo !== "all" && coupon.appliesTo !== context) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        context === "renewal"
          ? "هذا الكود للتجديد فقط"
          : "هذا الكود للاشتراك الجديد فقط",
    });
  }

  if (coupon.planSlug && planSlug && coupon.planSlug !== planSlug) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "كود الخصم لا ينطبق على هذه الخطة",
    });
  }

  const prior = await db
    .select()
    .from(couponRedemptions)
    .where(
      and(
        eq(couponRedemptions.couponId, coupon.id),
        eq(couponRedemptions.userId, userId),
      ),
    );
  if (prior.length > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "استخدمت هذا الكود مسبقاً",
    });
  }

  return coupon;
}

export function calculateDiscount(
  amount: number,
  coupon: { discountType: string; discountValue: number },
): number {
  if (coupon.discountType === "percent") {
    return Math.round((amount * coupon.discountValue) / 100);
  }
  return Math.min(amount, coupon.discountValue);
}

export async function redeemCoupon(
  couponId: number,
  userId: number,
  discountApplied: number,
) {
  const db = getDb();
  await db.insert(couponRedemptions).values({
    couponId,
    userId,
    discountApplied,
  });
  const row = await db
    .select()
    .from(coupons)
    .where(eq(coupons.id, couponId))
    .then((r) => r[0]);
  if (row) {
    await db
      .update(coupons)
      .set({ usedCount: row.usedCount + 1 })
      .where(eq(coupons.id, couponId));
  }
}

export async function ensureUserIdentity(userId: number) {
  const db = getDb();
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .then((r) => r[0]);
  if (!user) return null;

  const patch: Record<string, unknown> = {};

  if (!user.userNumber) {
    const n = await nextSequence("user");
    patch.userNumber = n;
    if (!user.referralCode) {
      patch.referralCode = generateReferralCode(n);
    }
  } else if (!user.referralCode) {
    patch.referralCode = generateReferralCode(user.userNumber);
  }

  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, userId));
    return { ...user, ...patch };
  }
  return user;
}
