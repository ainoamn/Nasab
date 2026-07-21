import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { invoices, users } from "@db/tables";
import { SUBSCRIPTION_PLANS } from "@contracts/constants";
import { getOwnerUsage } from "./planLimits";
import {
  calculateDiscount,
  ensureUserIdentity,
  validateCoupon,
} from "./couponService";
import { formatUserNumber } from "./sequences";

const profileInput = z.object({
  name: z.string().min(1, "الاسم مطلوب").max(255),
  phone: z.string().max(32).nullish(),
  addressLine1: z.string().max(255).nullish(),
  addressLine2: z.string().max(255).nullish(),
  city: z.string().max(128).nullish(),
  addressRegion: z.string().max(128).nullish(),
  country: z.string().length(2).nullish(),
  billingEmail: z.string().email("بريد الفوترة غير صالح").max(320).nullish(),
});

function pickProfile(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    userNumber: user.userNumber,
    userNumberFormatted: user.userNumber
      ? formatUserNumber(user.userNumber)
      : null,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    phone: user.phone,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    city: user.city,
    addressRegion: user.addressRegion,
    country: user.country ?? "OM",
    billingEmail: user.billingEmail,
    plan: user.plan ?? "free",
    planStartedAt: user.planStartedAt,
    planExpiresAt: user.planExpiresAt,
    referralCode: user.referralCode,
    referredByUserId: user.referredByUserId,
    role: user.role,
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
  };
}

export const userRouter = createRouter({
  /** ملف شخصي سريع */
  getProfile: authedQuery.query(async ({ ctx }) => {
    await ensureUserIdentity(ctx.user.id);
    const db = getDb();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .then((r) => r[0]);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return pickProfile(user);
  }),

  /** إحصاءات الاستخدام */
  getUsage: authedQuery.query(async ({ ctx }) => {
    const usage = await getOwnerUsage(ctx.user.id);
    return {
      ownedTrees: usage.ownedTrees,
      sharedTrees: usage.sharedTrees,
      totalPersons: usage.totalPersons,
      personLimit: usage.limits.maxPersonsTotal,
      maxTrees: usage.limits.maxTrees,
      maxPersonsPerTree: usage.limits.maxPersonsPerTree,
      planLimits: usage.limits,
    };
  }),

  /** توافق — يجمع الملف + الاستخدام */
  getAccount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    await ensureUserIdentity(ctx.user.id);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .then((r) => r[0]);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    const usage = await getOwnerUsage(ctx.user.id);
    return {
      profile: pickProfile(user),
      usage: {
        ownedTrees: usage.ownedTrees,
        sharedTrees: usage.sharedTrees,
        totalPersons: usage.totalPersons,
        personLimit: usage.limits.maxPersonsTotal,
        maxTrees: usage.limits.maxTrees,
        maxPersonsPerTree: usage.limits.maxPersonsPerTree,
        planLimits: usage.limits,
      },
    };
  }),

  updateProfile: authedQuery.input(profileInput).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db
      .update(users)
      .set({
        name: input.name,
        phone: input.phone ?? null,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
        city: input.city ?? null,
        addressRegion: input.addressRegion ?? null,
        country: input.country ?? "OM",
        billingEmail: input.billingEmail ?? null,
      })
      .where(eq(users.id, ctx.user.id));

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .then((r) => r[0]);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return pickProfile(user);
  }),

  listInvoices: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(invoices)
      .where(eq(invoices.userId, ctx.user.id))
      .orderBy(desc(invoices.issuedAt));
  }),

  applyCoupon: authedQuery
    .input(
      z.object({
        code: z.string().min(1).max(64),
        context: z.enum(["new", "renewal"]).default("new"),
        planSlug: z.enum(SUBSCRIPTION_PLANS).optional(),
        amount: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const coupon = await validateCoupon(
        input.code,
        ctx.user.id,
        input.context,
        input.planSlug,
      );
      const baseAmount = input.amount ?? 0;
      const discount = calculateDiscount(baseAmount, coupon);
      return {
        ok: true,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountApplied: discount,
        message:
          coupon.discountType === "percent"
            ? `خصم ${coupon.discountValue}%`
            : `خصم ${(coupon.discountValue / 1000).toFixed(3)} ر.ع.`,
        note: "سيُطبَّق الخصم عند إتمام الدفع",
      };
    }),

  applyReferralCode: authedQuery
    .input(z.object({ code: z.string().min(1).max(32) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const me = await db
        .select()
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .then((r) => r[0]);
      if (!me) throw new TRPCError({ code: "NOT_FOUND" });
      if (me.referredByUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "سجّلت برمز إحالة مسبقاً",
        });
      }

      const normalized = input.code.trim().toUpperCase();
      const referrer = await db
        .select()
        .from(users)
        .where(eq(users.referralCode, normalized))
        .then((r) => r[0]);

      if (!referrer) {
        throw new TRPCError({ code: "NOT_FOUND", message: "رمز الإحالة غير صالح" });
      }
      if (referrer.id === ctx.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكنك استخدام رمزك الخاص",
        });
      }

      await db
        .update(users)
        .set({ referredByUserId: referrer.id })
        .where(eq(users.id, ctx.user.id));

      return { ok: true, referrerName: referrer.name };
    }),
});
