import { eq, or, like, and, sql } from "drizzle-orm";
import * as schema from "@db/tables";
import type { User } from "@db/tables";
import { getDb, getNeonSql } from "./connection";
import { getDatabaseDialect } from "@db/dialect";
import { env } from "../lib/env";
import {
  bhdUnionId,
  canLinkByVerifiedEmail,
  normalizeEmail,
} from "../lib/bhd-identity";
import { findUserByUnionId } from "./users";

let bhdSubReady = false;

export async function ensureBhdSubColumn() {
  if (bhdSubReady) return;
  const dialect = getDatabaseDialect(env.databaseUrl);
  const neon = getNeonSql();
  try {
    if (neon) {
      await neon`ALTER TABLE users ADD COLUMN IF NOT EXISTS bhd_sub UUID`;
      await neon`CREATE UNIQUE INDEX IF NOT EXISTS users_bhd_sub_idx ON users (bhd_sub)`;
    } else if (dialect === "sqlite") {
      try {
        await getDb().run(sql`ALTER TABLE users ADD COLUMN bhd_sub text`);
      } catch {
        /* column may already exist */
      }
      try {
        await getDb().run(
          sql`CREATE UNIQUE INDEX IF NOT EXISTS users_bhd_sub_idx ON users (bhd_sub)`,
        );
      } catch {
        /* index may already exist */
      }
    } else if (dialect === "postgres") {
      await getDb().execute(
        sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS bhd_sub UUID`,
      );
      await getDb().execute(
        sql`CREATE UNIQUE INDEX IF NOT EXISTS users_bhd_sub_idx ON users (bhd_sub)`,
      );
    } else {
      await getDb().execute(
        sql`ALTER TABLE users ADD COLUMN bhd_sub VARCHAR(36) NULL`,
      );
      await getDb().execute(
        sql`CREATE UNIQUE INDEX users_bhd_sub_idx ON users (bhd_sub)`,
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/duplicate|already exists|exists/i.test(message)) {
      console.warn("[nasab] bhd_sub column ensure:", message);
    }
  }
  bhdSubReady = true;
}

export async function findUserByBhdSub(sub: string): Promise<User | undefined> {
  try {
    const rows = await getDb()
      .select()
      .from(schema.users)
      .where(eq(schema.users.bhdSub, sub))
      .limit(1);
    return rows.at(0);
  } catch {
    return undefined;
  }
}

async function findLinkableUserByEmail(email: string): Promise<User | undefined> {
  const normalized = normalizeEmail(email);
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(
      and(
        sql`lower(${schema.users.email}) = ${normalized}`,
        or(
          like(schema.users.unionId, "google:%"),
          like(schema.users.unionId, "password:%"),
        ),
      ),
    )
    .limit(2);
  const matches = rows.filter((row) => canLinkByVerifiedEmail(row, normalized));
  if (matches.length !== 1) return undefined;
  return matches[0];
}

async function updateLinkedUser(
  user: User,
  input: {
    sub: string;
    email: string;
    name: string | null;
    picture: string | null;
    ip: string | null;
  },
) {
  const neon = getNeonSql();
  if (neon) {
    await neon`
      UPDATE users SET
        bhd_sub = COALESCE(bhd_sub, ${input.sub}::uuid),
        name = ${input.name ?? user.name},
        email = ${input.email},
        avatar = ${input.picture ?? user.avatar},
        "lastSignInAt" = NOW(),
        "lastSignInIp" = ${input.ip},
        "updatedAt" = NOW()
      WHERE id = ${user.id}
    `;
    return;
  }
  await getDb()
    .update(schema.users)
    .set({
      bhdSub: user.bhdSub || input.sub,
      name: input.name ?? user.name,
      email: input.email,
      avatar: input.picture ?? user.avatar,
      lastSignInAt: new Date(),
      lastSignInIp: input.ip,
    })
    .where(eq(schema.users.id, user.id));
}

export async function linkOrCreateBhdUser(input: {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  preferredUsername: string | null;
  phoneNumber: string | null;
  ip: string | null;
}): Promise<{ id: number; unionId: string }> {
  await ensureBhdSubColumn();
  const email = normalizeEmail(input.email);

  const existing =
    (await findUserByBhdSub(input.sub)) ||
    (await findLinkableUserByEmail(email));

  if (existing) {
    if (existing.isBanned) {
      throw new Error("user_banned");
    }
    if (existing.bhdSub && existing.bhdSub !== input.sub) {
      throw new Error("bhd_sub_conflict");
    }
    await updateLinkedUser(existing, {
      sub: input.sub,
      email,
      name: input.name,
      picture: input.picture,
      ip: input.ip,
    });
    return { id: existing.id, unionId: existing.unionId };
  }

  const unionId = bhdUnionId(input.sub);
  const neon = getNeonSql();
  if (neon) {
    await neon`
      INSERT INTO users (
        "unionId", bhd_sub, name, email, avatar, username, phone, role, plan,
        "isBanned", "sessionVersion", country,
        "lastSignInAt", "lastSignInIp", "registrationIp",
        "createdAt", "updatedAt"
      ) VALUES (
        ${unionId},
        ${input.sub}::uuid,
        ${input.name},
        ${email},
        ${input.picture},
        ${input.preferredUsername},
        ${input.phoneNumber},
        'user',
        'free',
        false,
        0,
        'OM',
        NOW(),
        ${input.ip},
        ${input.ip},
        NOW(),
        NOW()
      )
      ON CONFLICT ("unionId") DO UPDATE SET
        bhd_sub = COALESCE(users.bhd_sub, EXCLUDED.bhd_sub),
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        avatar = EXCLUDED.avatar,
        "lastSignInAt" = EXCLUDED."lastSignInAt",
        "lastSignInIp" = EXCLUDED."lastSignInIp",
        "updatedAt" = NOW()
    `;
  } else {
    const dialect = getDatabaseDialect(env.databaseUrl);
    const values = {
      unionId,
      bhdSub: input.sub,
      name: input.name,
      email,
      avatar: input.picture,
      username: input.preferredUsername,
      phone: input.phoneNumber,
      lastSignInAt: new Date(),
      lastSignInIp: input.ip,
      registrationIp: input.ip,
    };
    if (dialect === "mysql") {
      await getDb()
        .insert(schema.users)
        .values(values)
        .onDuplicateKeyUpdate({
          set: {
            bhdSub: input.sub,
            name: input.name,
            email,
            avatar: input.picture,
            lastSignInAt: new Date(),
            lastSignInIp: input.ip,
          },
        });
    } else {
      await getDb()
        .insert(schema.users)
        .values(values)
        .onConflictDoUpdate({
          target: schema.users.unionId,
          set: {
            bhdSub: input.sub,
            name: input.name,
            email,
            avatar: input.picture,
            lastSignInAt: new Date(),
            lastSignInIp: input.ip,
          },
        });
    }
  }

  const created = await findUserByUnionId(unionId);
  if (!created) throw new Error("user_missing");
  return { id: created.id, unionId: created.unionId };
}
