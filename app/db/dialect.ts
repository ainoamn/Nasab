export function isSqliteDatabase(url?: string): boolean {
  return (url ?? process.env.DATABASE_URL ?? "").startsWith("file:");
}
