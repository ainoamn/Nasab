import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

/** Static imports so esbuild inlines postgres.js into the Vercel function. */
export function createPostgresJsDb(
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
