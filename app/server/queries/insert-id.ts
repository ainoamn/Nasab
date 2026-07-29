import { getDatabaseDialect } from "@db/dialect";
import { env } from "../lib/env";
import { getDb } from "./connection";

const BATCH = 100;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertReturningId(
  table: any,
  values: Record<string, unknown>,
): Promise<number> {
  const [id] = await insertReturningIds(table, [values]);
  return id!;
}

/**
 * Bulk insert with returned primary keys (insertion order preserved).
 * Chunks rows to keep Neon/Vercel latency and payload size under control.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertReturningIds(
  table: any,
  rows: Record<string, unknown>[],
): Promise<number[]> {
  if (rows.length === 0) return [];
  const db = getDb();
  const dialect = getDatabaseDialect(env.databaseUrl);
  const ids: number[] = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    if (dialect === "mysql") {
      const returned = await db.insert(table).values(chunk).$returningId();
      for (const row of returned as Array<{ id: number }>) {
        ids.push(row.id);
      }
    } else {
      const returned = await db
        .insert(table)
        .values(chunk)
        .returning({ id: table.id });
      for (const row of returned as Array<{ id: number }>) {
        ids.push(row.id);
      }
    }
  }
  return ids;
}

/** Bulk insert without needing returned IDs (relationships, etc.). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertMany(
  table: any,
  rows: Record<string, unknown>[],
): Promise<number> {
  if (rows.length === 0) return 0;
  const db = getDb();
  let n = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await db.insert(table).values(chunk);
    n += chunk.length;
  }
  return n;
}
