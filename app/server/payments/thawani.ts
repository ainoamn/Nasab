import crypto from "node:crypto";
import type { PaymentAdapter } from "./types";

function checkoutHost(isTestMode: boolean, baseUrl: string) {
  if (baseUrl.includes("uat")) return "https://uatcheckout.thawani.om";
  if (!isTestMode) return "https://checkout.thawani.om";
  return "https://uatcheckout.thawani.om";
}

function verifyThawaniSignature(
  rawBody: string,
  headers: Record<string, string>,
  secret: string,
): boolean {
  const signature = headers["thawani-signature"] ?? headers["Thawani-Signature"];
  const timestamp = headers["thawani-timestamp"] ?? headers["Thawani-Timestamp"];
  if (!signature || !timestamp) return false;
  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export const thawaniAdapter: PaymentAdapter = {
  slug: "thawani",

  async createCheckout(config, input, isTestMode) {
    const secretKey = config.secretKey?.trim();
    const publishableKey = config.publishableKey?.trim();
    const baseUrl = (config.baseUrl?.trim() || "https://uatcheckout.thawani.om/api/v1").replace(
      /\/$/,
      "",
    );

    if (!secretKey || !publishableKey) {
      throw new Error("أكمل مفاتيح ثواني (Publishable + Secret) من لوحة المشرف");
    }

    const successUrl = `${input.origin}/api/checkout/complete?invoice=${encodeURIComponent(input.invoiceNumber)}&gateway=thawani&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${input.origin}/checkout?plan=${input.planSlug}&cancelled=1`;

    const resp = await fetch(`${baseUrl}/checkout/session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "thawani-api-key": secretKey,
      },
      body: JSON.stringify({
        client_reference_id: input.invoiceNumber,
        mode: "payment",
        products: [
          {
            name: input.description.slice(0, 120),
            quantity: 1,
            unit_amount: input.amount,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          invoice_number: input.invoiceNumber,
          user_id: String(input.user.id),
          plan: input.planSlug,
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Thawani: ${errText.slice(0, 200)}`);
    }

    const body = (await resp.json()) as {
      data?: { session_id?: string };
      session_id?: string;
    };
    const sessionId = body.data?.session_id ?? body.session_id;
    if (!sessionId) throw new Error("Thawani: لم يُرجَع معرّف الجلسة");

    const host = checkoutHost(isTestMode, baseUrl);
    return {
      kind: "redirect",
      externalId: sessionId,
      redirectUrl: `${host}/pay/${sessionId}?key=${publishableKey}`,
    };
  },

  async verifyReturn(config, params) {
    const sessionId = params.session_id;
    if (!sessionId) return { paid: false };

    const secretKey = config.secretKey?.trim();
    const baseUrl = (config.baseUrl?.trim() || "https://uatcheckout.thawani.om/api/v1").replace(
      /\/$/,
      "",
    );
    if (!secretKey) return { paid: false };

    const resp = await fetch(`${baseUrl}/checkout/session/${sessionId}`, {
      headers: { "thawani-api-key": secretKey },
    });
    if (!resp.ok) return { paid: false };

    const body = (await resp.json()) as {
      data?: {
        payment_status?: string;
        client_reference_id?: string;
        total_amount?: number;
      };
      payment_status?: string;
      client_reference_id?: string;
    };
    const data = body.data ?? body;
    const status = data.payment_status;
    return {
      paid: status === "paid",
      externalId: sessionId,
      invoiceNumber: data.client_reference_id,
      amountPaid: (data as { total_amount?: number }).total_amount,
    };
  },

  async handleWebhook(config, rawBody, headers) {
    const webhookSecret = config.webhookSecret?.trim();
    if (!webhookSecret) return null;
    if (!verifyThawaniSignature(rawBody, headers, webhookSecret)) return null;

    try {
      const payload = JSON.parse(rawBody) as {
        data?: {
          session_id?: string;
          payment_status?: string;
          client_reference_id?: string;
          total_amount?: number;
        };
        event_type?: string;
      };
      const data = payload.data;
      if (!data) return null;

      const paid =
        data.payment_status === "paid" ||
        payload.event_type === "checkout.completed" ||
        payload.event_type === "payment.succeeded";

      return {
        invoiceNumber: data.client_reference_id,
        externalId: data.session_id,
        paid,
        amountPaid: data.total_amount,
      };
    } catch {
      return null;
    }
  },
};
