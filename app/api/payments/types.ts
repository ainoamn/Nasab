import type { PaymentGatewaySlug, SubscriptionPlan } from "@contracts/constants";

export type CheckoutContext = "new" | "renewal";

export type InvoiceMetadata = {
  planSlug: SubscriptionPlan;
  context: CheckoutContext;
  originalAmount: number;
  discountApplied: number;
  renewalDiscountApplied?: number;
  couponId?: number;
  couponCode?: string;
};

export type CheckoutUser = {
  id: number;
  name: string | null;
  email: string | null;
  billingEmail: string | null;
  plan: SubscriptionPlan;
};

export type CheckoutInput = {
  invoiceNumber: string;
  invoiceId: number;
  amount: number;
  currency: string;
  description: string;
  planSlug: SubscriptionPlan;
  user: CheckoutUser;
  origin: string;
  metadata: InvoiceMetadata;
};

export type CheckoutResult = {
  kind: "redirect" | "offline" | "free";
  redirectUrl?: string;
  externalId?: string;
  instructions?: string;
  bankDetails?: Record<string, string>;
};

export type PaymentAdapter = {
  slug: PaymentGatewaySlug;
  createCheckout(
    config: Record<string, string>,
    input: CheckoutInput,
    isTestMode: boolean,
  ): Promise<CheckoutResult>;
  verifyReturn?(
    config: Record<string, string>,
    params: Record<string, string>,
    isTestMode: boolean,
  ): Promise<{ paid: boolean; externalId?: string }>;
  handleWebhook?(
    config: Record<string, string>,
    rawBody: string,
    headers: Record<string, string>,
    isTestMode: boolean,
  ): Promise<{ invoiceNumber?: string; externalId?: string; paid: boolean } | null>;
};
