/**
 * Bundled as sibling `db-pg.cjs` next to the Vercel handler.
 * Loaded only from getDb() — never at cold-start import time.
 *
 * Uses Neon HTTP (fetch) so serverless does not hang on TCP sockets.
 */
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

export function createPg(
  url: string,
  schema: Record<string, unknown>,
  _opts?: { max?: number },
) {
  return drizzle(neon(url), { schema });
}
