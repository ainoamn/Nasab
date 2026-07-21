import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import {
  paymentGateways,
  subscriptionPlans,
} from "@db/tables";
import type { PaymentGatewaySlug, SubscriptionPlan } from "@contracts/constants";
import { PAYMENT_GATEWAY_SLUGS } from "@contracts/constants";

const DEFAULT_PLANS: Array<{
  slug: SubscriptionPlan;
  nameAr: string;
  nameEn: string;
  maxTrees: number | null;
  maxPersonsPerTree: number | null;
  maxPersonsTotal: number | null;
  priceYearly: number;
  includesPrint: boolean;
  requiresPayment: boolean;
  sortOrder: number;
}> = [
  {
    slug: "free",
    nameAr: "المجانية",
    nameEn: "Free",
    maxTrees: null,
    maxPersonsPerTree: null,
    maxPersonsTotal: 500,
    priceYearly: 0,
    includesPrint: false,
    requiresPayment: false,
    sortOrder: 0,
  },
  {
    slug: "plus",
    nameAr: "نَسَب بلس",
    nameEn: "Nasab Plus",
    maxTrees: null,
    maxPersonsPerTree: null,
    maxPersonsTotal: null,
    priceYearly: 0,
    includesPrint: false,
    requiresPayment: false,
    sortOrder: 1,
  },
  {
    slug: "print",
    nameAr: "الطباعة",
    nameEn: "Print & Unlimited",
    maxTrees: null,
    maxPersonsPerTree: null,
    maxPersonsTotal: null,
    priceYearly: 0,
    includesPrint: true,
    requiresPayment: false,
    sortOrder: 2,
  },
];

const GATEWAY_META: Record<
  PaymentGatewaySlug,
  { nameAr: string; nameEn: string; sortOrder: number; config: Record<string, string> }
> = {
  thawani: {
    nameAr: "ثواني",
    nameEn: "Thawani",
    sortOrder: 0,
    config: {
      publishableKey: "",
      secretKey: "",
      webhookSecret: "",
      baseUrl: "https://uatcheckout.thawani.om/api/v1",
    },
  },
  stripe: {
    nameAr: "Stripe",
    nameEn: "Stripe",
    sortOrder: 1,
    config: {
      publishableKey: "",
      secretKey: "",
      webhookSecret: "",
    },
  },
  paypal: {
    nameAr: "PayPal",
    nameEn: "PayPal",
    sortOrder: 2,
    config: {
      clientId: "",
      clientSecret: "",
      webhookId: "",
    },
  },
  bank_transfer: {
    nameAr: "تحويل بنكي",
    nameEn: "Bank transfer",
    sortOrder: 3,
    config: {
      bankName: "",
      accountName: "",
      accountNumber: "",
      iban: "",
      instructions: "",
    },
  },
  manual: {
    nameAr: "دفع يدوي",
    nameEn: "Manual payment",
    sortOrder: 4,
    config: {
      instructions: "",
    },
  },
};

export async function ensurePlatformDefaults() {
  const db = getDb();

  for (const plan of DEFAULT_PLANS) {
    const existing = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.slug, plan.slug))
      .then((r) => r[0]);
    if (!existing) {
      await db.insert(subscriptionPlans).values(plan);
    }
  }

  for (const slug of PAYMENT_GATEWAY_SLUGS) {
    const meta = GATEWAY_META[slug];
    const existing = await db
      .select()
      .from(paymentGateways)
      .where(eq(paymentGateways.slug, slug))
      .then((r) => r[0]);
    if (!existing) {
      await db.insert(paymentGateways).values({
        slug,
        nameAr: meta.nameAr,
        nameEn: meta.nameEn,
        isEnabled: false,
        isTestMode: true,
        configJson: JSON.stringify(meta.config),
        sortOrder: meta.sortOrder,
      });
    }
  }
}

export function gatewayFieldLabels(slug: PaymentGatewaySlug): Record<string, string> {
  return GATEWAY_META[slug]?.config ?? {};
}
