import { eq } from "drizzle-orm";
import * as schema from "@db/tables";
import type { InsertUser } from "@db/tables";
import { getDb, getNeonSql } from "./connection";
import { getDatabaseDialect } from "@db/dialect";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

/**
 * Neon HTTP raw upsert — preferred on Vercel so login does not depend on
 * Drizzle query building across the db-pg sidecar boundary.
 */
async function upsertUserNeonRaw(values: {
  unionId: string;
  name: string | null;
  email: string | null;
  username: string | null;
  role: string;
  plan: string;
  lastSignInAt: Date;
  lastSignInIp: string | null;
  registrationIp: string | null;
}) {
  const sql = getNeonSql();
  if (!sql) throw new Error("neon sql client unavailable");

  await sql`
    INSERT INTO users (
      "unionId", name, email, username, role, plan,
      "isBanned", "sessionVersion", country,
      "lastSignInAt", "lastSignInIp", "registrationIp",
      "createdAt", "updatedAt"
    ) VALUES (
      ${values.unionId},
      ${values.name},
      ${values.email},
      ${values.username},
      ${values.role},
      ${values.plan},
      false,
      0,
      'OM',
      ${values.lastSignInAt},
      ${values.lastSignInIp},
      ${values.registrationIp},
      NOW(),
      NOW()
    )
    ON CONFLICT ("unionId") DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      username = EXCLUDED.username,
      role = EXCLUDED.role,
      plan = EXCLUDED.plan,
      "lastSignInAt" = EXCLUDED."lastSignInAt",
      "lastSignInIp" = EXCLUDED."lastSignInIp",
      "updatedAt" = NOW()
  `;
}

export async function upsertUser(
  data: InsertUser & { signInIp?: string | null },
) {
  const values = { ...data };
  const ip = data.signInIp ?? data.lastSignInIp ?? null;
  if (ip) values.lastSignInIp = ip;

  delete (values as { signInIp?: unknown }).signInIp;

  const dialect = getDatabaseDialect(env.databaseUrl);

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
  }

  // Serverless: raw Neon upsert first (handles insert + conflict update).
  if (
    dialect === "postgres" &&
    (process.env.VERCEL || process.env.NASAB_SERVERLESS === "1") &&
    values.unionId
  ) {
    await upsertUserNeonRaw({
      unionId: String(values.unionId),
      name: (values.name as string | null | undefined) ?? null,
      email: (values.email as string | null | undefined) ?? null,
      username: (values.username as string | null | undefined) ?? null,
      role: String(values.role ?? "user"),
      plan: String(values.plan ?? "free"),
      lastSignInAt:
        values.lastSignInAt instanceof Date
          ? values.lastSignInAt
          : new Date(),
      lastSignInIp: (values.lastSignInIp as string | null | undefined) ?? null,
      registrationIp:
        (values.registrationIp as string | null | undefined) ?? ip ?? null,
    });
    return;
  }

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

  if (dialect === "sqlite" || dialect === "postgres") {
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
