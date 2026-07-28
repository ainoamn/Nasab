/**
 * Bundled as a sibling `db-pg.cjs` next to the Vercel handler.
 * Loaded only when getDb() needs Postgres — never at cold-start import time.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

export function createPg(
  url: string,
  schema: Record<string, unknown>,
  opts?: { max?: number },
) {
  const client = postgres(url, {
    prepare: false,
    max: opts?.max ?? 1,
    connect_timeout: 8,
    idle_timeout: 20,
    max_lifetime: 60 * 5,
  });
  return drizzle(client, { schema });
}
