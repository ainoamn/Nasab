#!/usr/bin/env node
/**
 * Seed platform defaults (plans/gateways/settings) into Neon from .env.production.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";
import { sanitizeDatabaseUrl } from "../db/dialect.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.production"), override: true });

if (!/^postgres/i.test(process.env.DATABASE_URL || "")) {
  console.error("DATABASE_URL must be postgres in .env.production");
  process.exit(1);
}

const sql = neon(sanitizeDatabaseUrl(process.env.DATABASE_URL));

const plans = [
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
    priceYearly: 9900,
    includesPrint: false,
    requiresPayment: true,
    sortOrder: 1,
  },
  {
    slug: "print",
    nameAr: "الطباعة",
    nameEn: "Print & Unlimited",
    maxTrees: null,
    maxPersonsPerTree: null,
    maxPersonsTotal: null,
    priceYearly: 19900,
    includesPrint: true,
    requiresPayment: true,
    sortOrder: 2,
  },
];

for (const p of plans) {
  await sql`
    insert into subscription_plans (
      slug, "nameAr", "nameEn", "maxTrees", "maxPersonsPerTree", "maxPersonsTotal",
      "priceYearly", "includesPrint", "requiresPayment", "sortOrder"
    ) values (
      ${p.slug}, ${p.nameAr}, ${p.nameEn}, ${p.maxTrees}, ${p.maxPersonsPerTree}, ${p.maxPersonsTotal},
      ${p.priceYearly}, ${p.includesPrint}, ${p.requiresPayment}, ${p.sortOrder}
    )
    on conflict (slug) do update set
      "nameAr" = excluded."nameAr",
      "nameEn" = excluded."nameEn",
      "maxPersonsTotal" = excluded."maxPersonsTotal",
      "priceYearly" = excluded."priceYearly",
      "includesPrint" = excluded."includesPrint",
      "requiresPayment" = excluded."requiresPayment",
      "sortOrder" = excluded."sortOrder"
  `;
  console.log("plan", p.slug);
}

const gateways = [
  {
    slug: "bank_transfer",
    nameAr: "تحويل بنكي",
    nameEn: "Bank Transfer",
    isEnabled: true,
    sortOrder: 0,
  },
  { slug: "thawani", nameAr: "ثواني", nameEn: "Thawani", isEnabled: false, sortOrder: 1 },
  { slug: "stripe", nameAr: "سترايب", nameEn: "Stripe", isEnabled: false, sortOrder: 2 },
  { slug: "paypal", nameAr: "باي بال", nameEn: "PayPal", isEnabled: false, sortOrder: 3 },
];

for (const g of gateways) {
  await sql`
    insert into payment_gateways (
      slug, "nameAr", "nameEn", "isEnabled", "isTestMode", "configJson", "sortOrder"
    ) values (
      ${g.slug}, ${g.nameAr}, ${g.nameEn}, ${g.isEnabled}, true, '{}', ${g.sortOrder}
    )
    on conflict (slug) do update set
      "nameAr" = excluded."nameAr",
      "nameEn" = excluded."nameEn",
      "sortOrder" = excluded."sortOrder"
  `;
  console.log("gateway", g.slug);
}

await sql`
  insert into platform_settings (id)
  values (1)
  on conflict (id) do nothing
`;
console.log("platform_settings ok");

const planCount = await sql`select count(*)::int as n from subscription_plans`;
const gwCount = await sql`select count(*)::int as n from payment_gateways`;
console.log("DONE", { plans: planCount[0]?.n, gateways: gwCount[0]?.n });
