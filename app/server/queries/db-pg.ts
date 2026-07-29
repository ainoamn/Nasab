/**
 * Bundled as sibling `db-pg.cjs` next to the Vercel handler.
 * Loaded only from getDb() — never at cold-start import time.
 *
 * Exports the Neon HTTP SQL function only. Drizzle must be created in the
 * main bundle so table metadata and the ORM share one drizzle-orm copy.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type NeonSql = NeonQueryFunction<false, false>;

export function createNeonSql(url: string): NeonSql {
  return neon(url);
}

/** @deprecated Prefer createNeonSql + drizzle in the main bundle. */
export function createPg(
  url: string,
  schema: Record<string, unknown>,
  _opts?: { max?: number },
) {
  // Lazy require keeps this path usable if an old deploy still calls createPg.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/neon-http") as typeof import("drizzle-orm/neon-http");
  return drizzle(createNeonSql(url), { schema });
}
