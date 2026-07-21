import { eq } from "drizzle-orm";
import * as schema from "@db/tables";
import type { InsertUser } from "@db/tables";
import { getDb, isSqliteDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(
  data: InsertUser & { signInIp?: string | null },
) {
  const values = { ...data };
  const ip = data.signInIp ?? data.lastSignInIp ?? null;
  if (ip) values.lastSignInIp = ip;

  const existing = values.unionId
    ? await findUserByUnionId(values.unionId)
    : null;
  if (!existing && ip) {
    values.registrationIp = ip;
  }

  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };
  if (ip) updateSet.lastSignInIp = ip;

  delete (values as { signInIp?: unknown }).signInIp;
  delete (updateSet as { signInIp?: unknown }).signInIp;

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  const db = getDb();
  if (isSqliteDb()) {
    await db
      .insert(schema.users)
      .values(values)
      .onConflictDoUpdate({
        target: schema.users.unionId,
        set: updateSet,
      });
    return;
  }

  await db
    .insert(schema.users)
    .values(values)
    .onDuplicateKeyUpdate({ set: updateSet });
}
