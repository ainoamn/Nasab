import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import type { PaymentGatewaySlug, SubscriptionPlan } from "@contracts/constants";
import { getDb } from "../queries/connection";
import { invoices, subscriptionPlans, users } from "@db/tables";
import { insertReturningId } from "../queries/insert-id";
import {
  calculateDiscount,
  validateCoupon,
} from "../couponService";
import { formatInvoiceNumber, nextSequence } from "../sequences";
import { getPaymentAdapter } from "./index";
import { getGatewayBySlug } from "./gatewayConfig";
import { fulfillInvoice } from "./fulfillment";
import type { CheckoutContext, CheckoutResult, InvoiceMetadata } from "./types";

export type PricingPreview = {
  planSlug: SubscriptionPlan;
  context: CheckoutContext;
  originalAmount: number;
  renewalDiscountApplied: number;
  couponDiscount: number;
  finalAmount: number;
  currency: string;
  couponCode?: string;
};

export async function calculateCheckoutPricing(
  userId: number,
  planSlug: SubscriptionPlan,
  couponCode?: string,
): Promise<PricingPreview> {
  const db = getDb();
  const [user, plan] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).then((r) => r[0]),
    db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, planSlug))
      .then((r) => r[0]),
  ]);

  if (!user) throw new TRPCError({ code: "NOT_FOUND" });
  if (!plan || !plan.isActive) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "الخطة غير متاحة" });
  }
  if (planSlug === "free") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "الخطة المجانية لا تحتاج دفع" });
  }
  if (plan.priceYearly <= 0 && plan.requiresPayment) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "سعر الخطة غير مُعرَّف — حدّثه من لوحة المشرف (/admin/plans)",
    });
  }

  const currentPlan = (user.plan ?? "free") as SubscriptionPlan;
  const isRenewal =
    currentPlan !== "free" &&
    (currentPlan === planSlug || (currentPlan === "print" && planSlug === "plus"));
  const context: CheckoutContext = isRenewal ? "renewal" : "new";

  let amount = plan.priceYearly;
  let renewalDiscountApplied = 0;

  if (isRenewal && plan.renewalDiscountPercent > 0) {
    renewalDiscountApplied = Math.round((amount * plan.renewalDiscountPercent) / 100);
    amount -= renewalDiscountApplied;
  }

  let couponDiscount = 0;
  let normalizedCoupon: string | undefined;
  if (couponCode?.trim()) {
    const coupon = await validateCoupon(couponCode, userId, context, planSlug);
    couponDiscount = calculateDiscount(amount, coupon);
    normalizedCoupon = coupon.code;
  }

  const finalAmount = Math.max(0, amount - couponDiscount);

  return {
    planSlug,
    context,
    originalAmount: plan.priceYearly,
    renewalDiscountApplied,
    couponDiscount,
    finalAmount,
    currency: "OMR",
    couponCode: normalizedCoupon,
  };
}

export async function createSubscriptionCheckout(opts: {
  userId: number;
  planSlug: SubscriptionPlan;
  gatewaySlug: PaymentGatewaySlug;
  couponCode?: string;
  origin: string;
}): Promise<{
  invoiceId: number;
  invoiceNumber: string;
  checkout: CheckoutResult;
  pricing: PricingPreview;
}> {
  const db = getDb();
  const gateway = await getGatewayBySlug(opts.gatewaySlug);
  if (!gateway.isEnabled) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "بوابة الدفع غير مفعّلة" });
  }

  const pricing = await calculateCheckoutPricing(
    opts.userId,
    opts.planSlug,
    opts.couponCode,
  );

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, opts.userId))
    .then((r) => r[0]);
  if (!user) throw new TRPCError({ code: "NOT_FOUND" });

  const plan = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.slug, opts.planSlug))
    .then((r) => r[0]);
  if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "الخطة غير موجودة" });

  let couponId: number | undefined;
  if (opts.couponCode?.trim()) {
    const coupon = await validateCoupon(
      opts.couponCode,
      opts.userId,
      pricing.context,
      opts.planSlug,
    );
    couponId = coupon.id;
  }

  const metadata: InvoiceMetadata = {
    planSlug: opts.planSlug,
    context: pricing.context,
    originalAmount: pricing.originalAmount,
    discountApplied: pricing.couponDiscount,
    renewalDiscountApplied: pricing.renewalDiscountApplied,
    ...(couponId ? { couponId, couponCode: pricing.couponCode } : {}),
  };

  const seq = await nextSequence("invoice");
  const invoiceNumber = formatInvoiceNumber(seq);
  const description =
    pricing.context === "renewal"
      ? `تجديد ${plan.nameAr} — ${invoiceNumber}`
      : `اشتراك ${plan.nameAr} — ${invoiceNumber}`;

  const invoiceId = await insertReturningId(invoices, {
    userId: opts.userId,
    number: invoiceNumber,
    description,
    amount: pricing.finalAmount,
    currency: pricing.currency,
    status: "pending",
    gatewaySlug: opts.gatewaySlug,
    planSlug: opts.planSlug,
    metadataJson: JSON.stringify(metadata),
  });

  if (pricing.finalAmount === 0) {
    await fulfillInvoice(invoiceId);
    return {
      invoiceId,
      invoiceNumber,
      checkout: { kind: "free" },
      pricing,
    };
  }

  const adapter = getPaymentAdapter(opts.gatewaySlug);
  const checkout = await adapter.createCheckout(
    gateway.config,
    {
      invoiceNumber,
      invoiceId,
      amount: pricing.finalAmount,
      currency: pricing.currency,
      description,
      planSlug: opts.planSlug,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        billingEmail: user.billingEmail,
        plan: (user.plan ?? "free") as SubscriptionPlan,
      },
      origin: opts.origin,
      metadata,
    },
    gateway.isTestMode,
  );

  await db
    .update(invoices)
    .set({
      externalPaymentId: checkout.externalId ?? null,
      checkoutUrl: checkout.redirectUrl ?? null,
    })
    .where(eq(invoices.id, invoiceId));

  return { invoiceId, invoiceNumber, checkout, pricing };
}

export async function completeCheckoutReturn(params: {
  invoiceNumber: string;
  gatewaySlug: PaymentGatewaySlug;
  query: Record<string, string>;
}) {
  const gateway = await getGatewayBySlug(params.gatewaySlug);
  const adapter = getPaymentAdapter(params.gatewaySlug);

  let paid = false;
  let externalId: string | undefined;

  if (adapter.verifyReturn) {
    const verified = await adapter.verifyReturn(
      gateway.config,
      params.query,
      gateway.isTestMode,
    );
    paid = verified.paid;
    externalId = verified.externalId;
  }

  if (paid) {
    const db = getDb();
    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.number, params.invoiceNumber))
      .then((r) => r[0]);
    if (invoice) {
      await fulfillInvoice(invoice.id, { externalId });
    }
  }

  return { paid, invoiceNumber: params.invoiceNumber };
}
