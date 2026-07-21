import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { invoices, subscriptionPlans } from "@db/tables";
import { SUBSCRIPTION_PLANS, PAYMENT_GATEWAY_SLUGS } from "@contracts/constants";
import { ensurePlatformDefaults } from "./seedDefaults";
import {
  listEnabledGateways,
  publicGatewayFields,
} from "./payments/gatewayConfig";
import {
  calculateCheckoutPricing,
  createSubscriptionCheckout,
} from "./payments/checkoutService";

export const paymentRouter = createRouter({
  listGateways: authedQuery.query(async () => {
    const gateways = await listEnabledGateways();
    return gateways.map((g) => ({
      slug: g.slug,
      nameAr: g.nameAr,
      nameEn: g.nameEn,
      isTestMode: g.isTestMode,
      publicConfig: publicGatewayFields(g),
      isOffline: g.slug === "bank_transfer" || g.slug === "manual",
    }));
  }),

  listPlans: authedQuery.query(async () => {
    await ensurePlatformDefaults();
    const db = getDb();
    const rows = await db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.sortOrder);

    return rows
      .filter((p) => p.isActive && p.slug !== "free")
      .map((p) => ({
        slug: p.slug,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        priceYearly: p.priceYearly,
        periodDays: p.periodDays,
        renewalDiscountPercent: p.renewalDiscountPercent,
        includesPrint: p.includesPrint,
        requiresPayment: p.requiresPayment,
      }));
  }),

  previewCheckout: authedQuery
    .input(
      z.object({
        planSlug: z.enum(SUBSCRIPTION_PLANS),
        couponCode: z.string().max(64).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (input.planSlug === "free") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الخطة المجانية لا تحتاج دفع" });
      }
      return calculateCheckoutPricing(ctx.user.id, input.planSlug, input.couponCode);
    }),

  createCheckout: authedQuery
    .input(
      z.object({
        planSlug: z.enum(SUBSCRIPTION_PLANS),
        gatewaySlug: z.enum(PAYMENT_GATEWAY_SLUGS),
        couponCode: z.string().max(64).optional(),
        origin: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.planSlug === "free") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "الخطة المجانية لا تحتاج دفع" });
      }

      const origin =
        input.origin ??
        (typeof globalThis !== "undefined" && "location" in globalThis
          ? (globalThis as { location?: { origin?: string } }).location?.origin
          : undefined) ??
        "http://localhost:5173";

      try {
        return await createSubscriptionCheckout({
          userId: ctx.user.id,
          planSlug: input.planSlug,
          gatewaySlug: input.gatewaySlug,
          couponCode: input.couponCode,
          origin,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "فشل إنشاء الدفع";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  getInvoice: authedQuery
    .input(z.object({ number: z.string().min(1).max(64) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const row = await db
        .select()
        .from(invoices)
        .where(eq(invoices.number, input.number))
        .then((r) => r[0]);

      if (!row || row.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الفاتورة غير موجودة" });
      }

      return {
        number: row.number,
        description: row.description,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        gatewaySlug: row.gatewaySlug,
        planSlug: row.planSlug,
        paidAt: row.paidAt,
        issuedAt: row.issuedAt,
      };
    }),
});
