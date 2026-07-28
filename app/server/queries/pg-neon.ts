import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

/** Neon HTTP driver — static imports so esbuild bundles it into the Vercel function. */
export function createNeonHttpDb(url: string, schema: Record<string, unknown>) {
  return drizzle(neon(url), { schema });
}
