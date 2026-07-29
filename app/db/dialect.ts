export type DatabaseDialect = "sqlite" | "mysql" | "postgres";

function resolveUrl(url?: string): string {
  return url ?? process.env.DATABASE_URL ?? "";
}

export function isSqliteDatabase(url?: string): boolean {
  return resolveUrl(url).startsWith("file:");
}

export function isPostgresDatabase(url?: string): boolean {
  return /^postgres(ql)?:\/\//i.test(resolveUrl(url));
}

export function isMysqlDatabase(url?: string): boolean {
  return /^mysql2?:\/\//i.test(resolveUrl(url));
}

export function getDatabaseDialect(url?: string): DatabaseDialect {
  if (isSqliteDatabase(url)) return "sqlite";
  if (isPostgresDatabase(url)) return "postgres";
  return "mysql";
}

/**
 * Neon / some drivers struggle with channel_binding=require.
 * Avoid `new URL().toString()` — it can re-encode passwords and break auth.
 */
export function sanitizeDatabaseUrl(url: string): string {
  return url
    .replace(/([?&])channel_binding=[^&]*/gi, "")
    .replace(/\?&/, "?")
    .replace(/[?&]$/, "")
    .replace(/\?{2,}/g, "?");
}
