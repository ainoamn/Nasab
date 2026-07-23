import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { invoices } from "@db/tables";
import type { SubscriptionPlan } from "@contracts/constants";
import { redeemCoupon } from "../couponService";
import { applySubscriptionPlan, rewardReferrer } from "../subscriptionHelpers";
import type { InvoiceMetadata } from "./types";

export function parseInvoiceMetadata(raw: string | null): InvoiceMetadata | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as InvoiceMetadata;
  } catch {
    return null;
  }
}

export async function fulfillInvoice(
  invoiceId: number,
  opts?: { externalId?: string },
): Promise<{ ok: boolean; alreadyPaid?: boolean }> {
  const db = getDb();
  const invoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .then((r) => r[0]);

  if (!invoice) return { ok: false };
  if (invoice.status === "paid") return { ok: true, alreadyPaid: true };

  const metadata: InvoiceMetadata =
    parseInvoiceMetadata(invoice.metadataJson) ??
    (invoice.planSlug
      ? {
          planSlug: invoice.planSlug as SubscriptionPlan,
          context: "new" as const,
          originalAmount: invoice.amount,
          discountApplied: 0,
        }
      : {
          planSlug: "free" as SubscriptionPlan,
          context: "new" as const,
          originalAmount: invoice.amount,
          discountApplied: 0,
        });

  await db
    .update(invoices)
    .set({
      status: "paid",
      paidAt: new Date(),
      ...(opts?.externalId ? { externalPaymentId: opts.externalId } : {}),
    })
    .where(eq(invoices.id, invoiceId));

  if (metadata.couponId && metadata.discountApplied > 0) {
    await redeemCoupon(metadata.couponId, invoice.userId, metadata.discountApplied);
  }

  if (metadata.planSlug) {
    await applySubscriptionPlan(invoice.userId, metadata.planSlug, {
      extendFromCurrent: metadata.context === "renewal",
    });
  }

  await rewardReferrer(invoice.userId);
  return { ok: true };
}

export async function fulfillInvoiceByNumber(
  invoiceNumber: string,
  opts?: { externalId?: string },
) {
  const db = getDb();
  const invoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.number, invoiceNumber))
    .then((r) => r[0]);
  if (!invoice) return { ok: false };
  return fulfillInvoice(invoice.id, opts);
}
