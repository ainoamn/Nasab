import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { platformSequences } from "@db/tables";

export async function nextSequence(key: "user" | "invoice"): Promise<number> {
  const db = getDb();
  const row = await db
    .select()
    .from(platformSequences)
    .where(eq(platformSequences.key, key))
    .then((r) => r[0]);

  if (!row) {
    await db.insert(platformSequences).values({ key, nextValue: 2 });
    return 1;
  }

  const value = row.nextValue;
  await db
    .update(platformSequences)
    .set({ nextValue: value + 1 })
    .where(eq(platformSequences.key, key));
  return value;
}

export function formatUserNumber(n: number) {
  return `USR-${String(n).padStart(6, "0")}`;
}

export function formatInvoiceNumber(n: number) {
  return `INV-${String(n).padStart(6, "0")}`;
}

export function generateReferralCode(userNumber: number) {
  return `NSB${String(userNumber).padStart(5, "0")}`;
}
