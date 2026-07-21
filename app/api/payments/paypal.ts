import type { PaymentAdapter } from "./types";

async function paypalAccessToken(config: Record<string, string>, isTestMode: boolean) {
  const clientId = config.clientId?.trim();
  const clientSecret = config.clientSecret?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("أكمل PayPal Client ID و Secret من لوحة المشرف");
  }

  const base = isTestMode
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const resp = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!resp.ok) throw new Error("PayPal: فشل الحصول على رمز الوصول");
  const body = (await resp.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("PayPal: رمز وصول فارغ");
  return { token: body.access_token, base };
}

export const paypalAdapter: PaymentAdapter = {
  slug: "paypal",

  async createCheckout(config, input, isTestMode) {
    const { token, base } = await paypalAccessToken(config, isTestMode);

    const successUrl = `${input.origin}/api/checkout/complete?invoice=${encodeURIComponent(input.invoiceNumber)}&gateway=paypal`;
    const cancelUrl = `${input.origin}/checkout?plan=${input.planSlug}&cancelled=1`;

    const amountDecimal = (input.amount / 1000).toFixed(3);

    const resp = await fetch(`${base}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: input.invoiceNumber,
            description: input.description.slice(0, 120),
            amount: {
              currency_code: input.currency,
              value: amountDecimal,
            },
            custom_id: input.invoiceNumber,
          },
        ],
        application_context: {
          return_url: successUrl,
          cancel_url: cancelUrl,
          brand_name: "Nasab",
          user_action: "PAY_NOW",
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`PayPal: ${errText.slice(0, 200)}`);
    }

    const body = (await resp.json()) as {
      id?: string;
      links?: Array<{ rel: string; href: string }>;
    };
    const approve = body.links?.find((l) => l.rel === "approve" || l.rel === "payer-action");
    if (!body.id || !approve?.href) throw new Error("PayPal: لم يُرجَع رابط الموافقة");

    return {
      kind: "redirect",
      externalId: body.id,
      redirectUrl: approve.href,
    };
  },

  async verifyReturn(config, params, isTestMode) {
    const token = params.token;
    if (!token) return { paid: false };

    const { token: accessToken, base } = await paypalAccessToken(config, isTestMode);

    const resp = await fetch(`${base}/v2/checkout/orders/${token}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) return { paid: false, externalId: token };

    const body = (await resp.json()) as { status?: string; id?: string };
    return {
      paid: body.status === "COMPLETED",
      externalId: body.id ?? token,
    };
  },

  async handleWebhook(_config, rawBody) {
    try {
      const event = JSON.parse(rawBody) as {
        event_type?: string;
        resource?: {
          id?: string;
          status?: string;
          purchase_units?: Array<{ custom_id?: string; reference_id?: string }>;
        };
      };

      if (
        event.event_type !== "CHECKOUT.ORDER.APPROVED" &&
        event.event_type !== "PAYMENT.CAPTURE.COMPLETED"
      ) {
        return null;
      }

      const resource = event.resource;
      const unit = resource?.purchase_units?.[0];
      const invoiceNumber = unit?.custom_id ?? unit?.reference_id;
      const paid =
        resource?.status === "COMPLETED" || event.event_type === "PAYMENT.CAPTURE.COMPLETED";

      return {
        invoiceNumber,
        externalId: resource?.id,
        paid,
      };
    } catch {
      return null;
    }
  },
};
