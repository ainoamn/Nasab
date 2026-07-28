import { getDb, isSqliteDb } from "./connection";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertReturningId(
  table: any,
  values: Record<string, unknown>,
): Promise<number> {
  const db = getDb();
  if (isSqliteDb()) {
    const [row] = await db
      .insert(table)
      .values(values)
      .returning({ id: table.id });
    return row.id as number;
  }
  const [{ id }] = await db.insert(table).values(values).$returningId();
  return id;
}
