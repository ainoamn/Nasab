import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { invoices } from "@db/tables";
import type { PaymentGatewaySlug } from "@contracts/constants";
import { fulfillInvoice } from "./fulfillment";

export type PaymentVerification = {
  paid: boolean;
  invoiceNumber?: string;
  externalId?: string;
  amountPaid?: number;
};

export async function secureFulfillPayment(
  expectedInvoiceNumber: string,
  expectedGateway: PaymentGatewaySlug,
  verification: PaymentVerification,
): Promise<{ ok: boolean; paid: boolean; reason?: string }> {
  if (!verification.paid) {
    return { ok: true, paid: false };
  }

  const invoiceNumber = verification.invoiceNumber ?? expectedInvoiceNumber;
  if (invoiceNumber !== expectedInvoiceNumber) {
    return { ok: false, paid: false, reason: "invoice_mismatch" };
  }

  const db = getDb();
  const invoice = await db
    .select()
    .from(invoices)
    .where(eq(invoices.number, expectedInvoiceNumber))
    .then((r) => r[0]);

  if (!invoice) return { ok: false, paid: false, reason: "not_found" };
  if (invoice.status === "paid") return { ok: true, paid: true };
  if (invoice.status === "cancelled") {
    return { ok: false, paid: false, reason: "cancelled" };
  }

  if (invoice.gatewaySlug && invoice.gatewaySlug !== expectedGateway) {
    return { ok: false, paid: false, reason: "gateway_mismatch" };
  }

  if (
    verification.externalId &&
    invoice.externalPaymentId &&
    invoice.externalPaymentId !== verification.externalId
  ) {
    return { ok: false, paid: false, reason: "session_mismatch" };
  }

  if (
    verification.amountPaid != null &&
    verification.amountPaid < invoice.amount
  ) {
    return { ok: false, paid: false, reason: "amount_insufficient" };
  }

  await fulfillInvoice(invoice.id, { externalId: verification.externalId });
  return { ok: true, paid: true };
}
