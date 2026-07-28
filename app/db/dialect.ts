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
  if (isMysqlDatabase(url)) return "mysql";
  const resolved = resolveUrl(url).trim();
  if (!resolved) {
    throw new Error("DATABASE_URL is not set");
  }
  // Legacy bare mysql URLs without an explicit scheme.
  return "mysql";
}

/** True on Vercel / Build Output serverless runtimes. */
export function isServerlessRuntime(): boolean {
  return (
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.VERCEL_ENV) ||
    process.env.NASAB_SERVERLESS === "1"
  );
}

/** Neon / some drivers struggle with channel_binding=require */
export function sanitizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url.replace(/([?&])channel_binding=[^&]*/i, "").replace(/\?&/, "?");
  }
}
