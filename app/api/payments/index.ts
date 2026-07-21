import type { PaymentGatewaySlug } from "@contracts/constants";
import type { PaymentAdapter } from "./types";
import { thawaniAdapter } from "./thawani";
import { stripeAdapter } from "./stripe";
import { paypalAdapter } from "./paypal";
import { bankTransferAdapter, manualAdapter } from "./offline";

const ADAPTERS: Record<PaymentGatewaySlug, PaymentAdapter> = {
  thawani: thawaniAdapter,
  stripe: stripeAdapter,
  paypal: paypalAdapter,
  bank_transfer: bankTransferAdapter,
  manual: manualAdapter,
};

export function getPaymentAdapter(slug: PaymentGatewaySlug): PaymentAdapter {
  const adapter = ADAPTERS[slug];
  if (!adapter) throw new Error(`بوابة غير مدعومة: ${slug}`);
  return adapter;
}

export { ADAPTERS };
