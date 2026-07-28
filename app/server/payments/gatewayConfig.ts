import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { PaymentGatewaySlug } from "@contracts/constants";
import { getDb } from "../queries/connection";
import { paymentGateways } from "@db/tables";
import { decryptGatewayConfig } from "../lib/crypto";
import { ensurePlatformDefaults } from "../seedDefaults";

export type GatewayRow = {
  id: number;
  slug: PaymentGatewaySlug;
  nameAr: string;
  nameEn: string;
  isEnabled: boolean;
  isTestMode: boolean;
  config: Record<string, string>;
  sortOrder: number;
};

export function parseGatewayConfig(configJson: string | null): Record<string, string> {
  if (!configJson) return {};
  try {
    return JSON.parse(configJson) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function listEnabledGateways(): Promise<GatewayRow[]> {
  await ensurePlatformDefaults();
  const db = getDb();
  const rows = await db.select().from(paymentGateways).orderBy(paymentGateways.sortOrder);
  return rows
    .filter((g) => g.isEnabled)
    .map((g) => ({
      id: g.id,
      slug: g.slug as PaymentGatewaySlug,
      nameAr: g.nameAr,
      nameEn: g.nameEn,
      isEnabled: g.isEnabled,
      isTestMode: g.isTestMode,
      config: decryptGatewayConfig(parseGatewayConfig(g.configJson)),
      sortOrder: g.sortOrder,
    }));
}

export async function getGatewayBySlug(slug: PaymentGatewaySlug): Promise<GatewayRow> {
  await ensurePlatformDefaults();
  const db = getDb();
  const row = await db
    .select()
    .from(paymentGateways)
    .where(eq(paymentGateways.slug, slug))
    .then((r) => r[0]);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "بوابة الدفع غير موجودة" });
  }

  return {
    id: row.id,
    slug: row.slug as PaymentGatewaySlug,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    isEnabled: row.isEnabled,
    isTestMode: row.isTestMode,
    config: decryptGatewayConfig(parseGatewayConfig(row.configJson)),
    sortOrder: row.sortOrder,
  };
}

export function publicGatewayFields(g: GatewayRow) {
  const pub: Record<string, string> = {};
  if (g.config.publishableKey) pub.publishableKey = g.config.publishableKey;
  if (g.config.clientId) pub.clientId = g.config.clientId;
  return pub;
}
