import type { Context } from "hono";
import type { PaymentGatewaySlug } from "@contracts/constants";
import { PAYMENT_GATEWAY_SLUGS } from "@contracts/constants";
import { getPaymentAdapter } from "./index";
import { getGatewayBySlug } from "./gatewayConfig";
import { fulfillInvoiceByNumber } from "./fulfillment";

function slugFromPath(path: string): PaymentGatewaySlug | null {
  const match = path.match(/\/api\/webhooks\/([a-z_]+)/);
  const slug = match?.[1];
  if (!slug || !PAYMENT_GATEWAY_SLUGS.includes(slug as PaymentGatewaySlug)) {
    return null;
  }
  return slug as PaymentGatewaySlug;
}

export function createWebhookHandler() {
  return async (c: Context) => {
    const slug = slugFromPath(c.req.path);
    if (!slug) return c.json({ error: "Unknown gateway" }, 404);

    try {
      const gateway = await getGatewayBySlug(slug);
      const adapter = getPaymentAdapter(slug);
      if (!adapter.handleWebhook) {
        return c.json({ ok: true, skipped: true });
      }

      const rawBody = await c.req.text();
      const headers: Record<string, string> = {};
      c.req.raw.headers.forEach((v, k) => {
        headers[k.toLowerCase()] = v;
      });

      const result = await adapter.handleWebhook(
        gateway.config,
        rawBody,
        headers,
        gateway.isTestMode,
      );

      if (result?.paid && result.invoiceNumber) {
        await fulfillInvoiceByNumber(result.invoiceNumber, {
          externalId: result.externalId,
        });
      }

      return c.json({ ok: true, processed: Boolean(result?.paid) });
    } catch (err) {
      console.error("[webhook]", slug, err);
      return c.json({ error: "Webhook processing failed" }, 500);
    }
  };
}

export function createCheckoutCompleteHandler() {
  return async (c: Context) => {
    const invoiceNumber = c.req.query("invoice");
    const gateway = c.req.query("gateway") as PaymentGatewaySlug | undefined;

    if (!invoiceNumber || !gateway) {
      return c.redirect("/checkout/success?error=missing", 302);
    }

    try {
      const { completeCheckoutReturn } = await import("./checkoutService");
      const query: Record<string, string> = {};
      const url = new URL(c.req.url);
      url.searchParams.forEach((v, k) => {
        query[k] = v;
      });

      const result = await completeCheckoutReturn({
        invoiceNumber,
        gatewaySlug: gateway,
        query,
      });

      const status = result.paid ? "paid" : "pending";
      return c.redirect(
        `/checkout/success?invoice=${encodeURIComponent(invoiceNumber)}&status=${status}`,
        302,
      );
    } catch (err) {
      console.error("[checkout complete]", err);
      return c.redirect(
        `/checkout/success?invoice=${encodeURIComponent(invoiceNumber)}&status=error`,
        302,
      );
    }
  };
}
