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

  const db = getDb();

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  } else if (
    !existing &&
    values.role === undefined &&
    !env.ownerUnionId &&
    env.bootstrapFirstAdmin
  ) {
    const adminCount = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.role, "admin"))
      .limit(1)
      .then((r) => r.length);
    if (adminCount === 0) {
      values.role = "admin";
      updateSet.role = "admin";
    }
  }

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

export async function incrementSessionVersion(userId: number) {
  const db = getDb();
  const user = await db
    .select({ sessionVersion: schema.users.sessionVersion })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .then((r) => r[0]);
  const next = (user?.sessionVersion ?? 0) + 1;
  await db
    .update(schema.users)
    .set({ sessionVersion: next })
    .where(eq(schema.users.id, userId));
  return next;
}

export async function getUserSessionVersion(userId: number) {
  const row = await getDb()
    .select({ sessionVersion: schema.users.sessionVersion })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .then((r) => r[0]);
  return row?.sessionVersion ?? 0;
}
