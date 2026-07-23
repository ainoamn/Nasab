import { eq } from "drizzle-orm";
import { platformSettings } from "@db/tables";
import { getDb } from "../queries/connection";

export type CompanyBranding = {
  companyNameAr: string | null;
  companyNameEn: string | null;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxNumber: string | null;
};

const SETTINGS_ID = 1;

function toBranding(row: typeof platformSettings.$inferSelect): CompanyBranding {
  return {
    companyNameAr: row.companyNameAr,
    companyNameEn: row.companyNameEn,
    logoUrl: row.logoUrl,
    address: row.address,
    phone: row.phone,
    email: row.email,
    taxNumber: row.taxNumber,
  };
}

export async function ensurePlatformSettingsRow(): Promise<void> {
  const db = getDb();
  const existing = await db
    .select({ id: platformSettings.id })
    .from(platformSettings)
    .where(eq(platformSettings.id, SETTINGS_ID))
    .then((r) => r[0]);
  if (!existing) {
    await db.insert(platformSettings).values({
      id: SETTINGS_ID,
      companyNameAr: "نَسَب",
      companyNameEn: "Nasab",
    });
  } else {
    const row = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.id, SETTINGS_ID))
      .then((r) => r[0]);
    if (row && !row.companyNameAr && !row.companyNameEn) {
      await db
        .update(platformSettings)
        .set({ companyNameAr: "نَسَب", companyNameEn: "Nasab" })
        .where(eq(platformSettings.id, SETTINGS_ID));
    }
  }
}

export async function getCompanyBranding(): Promise<CompanyBranding> {
  await ensurePlatformSettingsRow();
  const db = getDb();
  const row = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.id, SETTINGS_ID))
    .then((r) => r[0]);
  if (!row) {
    return {
      companyNameAr: null,
      companyNameEn: null,
      logoUrl: null,
      address: null,
      phone: null,
      email: null,
      taxNumber: null,
    };
  }
  return toBranding(row);
}

export async function updateCompanySettings(
  patch: Partial<CompanyBranding>,
): Promise<CompanyBranding> {
  await ensurePlatformSettingsRow();
  const db = getDb();
  const values: Record<string, string | null> = {};
  for (const key of [
    "companyNameAr",
    "companyNameEn",
    "logoUrl",
    "address",
    "phone",
    "email",
    "taxNumber",
  ] as const) {
    if (patch[key] !== undefined) values[key] = patch[key];
  }
  if (Object.keys(values).length > 0) {
    await db
      .update(platformSettings)
      .set(values)
      .where(eq(platformSettings.id, SETTINGS_ID));
  }
  return getCompanyBranding();
}
