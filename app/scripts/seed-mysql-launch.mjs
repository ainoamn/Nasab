#!/usr/bin/env node
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.production") });
dotenv.config({ path: path.join(root, ".env") });

const url = process.env.DATABASE_URL;
if (!url || url.startsWith("file:")) {
  console.error("Set DATABASE_URL to MySQL (use .env.production)");
  process.exit(1);
}

const config = {
  bankName: process.env.BANK_NAME || "",
  accountName: process.env.BANK_ACCOUNT_NAME || "",
  accountNumber: process.env.BANK_ACCOUNT_NUMBER || "",
  iban: process.env.BANK_IBAN || "",
  instructions:
    process.env.BANK_INSTRUCTIONS ||
    "حوّل المبلغ ثم أرسل إيصال التحويل لتفعيل الاشتراك.",
};

const plans = [
  {
    slug: "free",
    nameAr: "المجانية",
    nameEn: "Free",
    maxPersonsTotal: 500,
    priceYearly: 0,
    includesPrint: 0,
    requiresPayment: 0,
    sortOrder: 0,
  },
  {
    slug: "plus",
    nameAr: "نَسَب بلس",
    nameEn: "Nasab Plus",
    maxPersonsTotal: null,
    priceYearly: 9900,
    includesPrint: 0,
    requiresPayment: 1,
    sortOrder: 1,
  },
  {
    slug: "print",
    nameAr: "الطباعة",
    nameEn: "Print & Unlimited",
    maxPersonsTotal: null,
    priceYearly: 19900,
    includesPrint: 1,
    requiresPayment: 1,
    sortOrder: 2,
  },
];

const c = await mysql.createConnection(url);

for (const p of plans) {
  await c.query(
    `INSERT INTO subscription_plans
      (slug, nameAr, nameEn, maxPersonsTotal, priceYearly, includesPrint, requiresPayment, sortOrder)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       priceYearly = IF(priceYearly = 0, VALUES(priceYearly), priceYearly),
       requiresPayment = IF(priceYearly = 0, VALUES(requiresPayment), requiresPayment)`,
    [
      p.slug,
      p.nameAr,
      p.nameEn,
      p.maxPersonsTotal,
      p.priceYearly,
      p.includesPrint,
      p.requiresPayment,
      p.sortOrder,
    ],
  );
}

const [rows] = await c.query(
  "SELECT id FROM payment_gateways WHERE slug = ? LIMIT 1",
  ["bank_transfer"],
);
if (rows.length) {
  await c.query(
    "UPDATE payment_gateways SET isEnabled = 1, isTestMode = 0, configJson = ? WHERE slug = ?",
    [JSON.stringify(config), "bank_transfer"],
  );
  console.log("updated bank_transfer gateway");
} else {
  await c.query(
    `INSERT INTO payment_gateways
      (slug, nameAr, nameEn, isEnabled, isTestMode, configJson, sortOrder)
     VALUES (?, ?, ?, 1, 0, ?, 3)`,
    ["bank_transfer", "تحويل بنكي", "Bank transfer", JSON.stringify(config)],
  );
  console.log("inserted bank_transfer gateway");
}

const [planRows] = await c.query(
  "SELECT slug, priceYearly, requiresPayment FROM subscription_plans ORDER BY sortOrder",
);
const [gw] = await c.query(
  "SELECT slug, isEnabled, isTestMode, configJson FROM payment_gateways WHERE slug = ?",
  ["bank_transfer"],
);
console.log("plans:", planRows);
console.log("gateway:", gw[0]);
await c.end();
