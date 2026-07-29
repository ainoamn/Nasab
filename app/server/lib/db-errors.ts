/** Strip secrets / connection strings from driver errors for safe API responses. */
export function sanitizeDbError(err: unknown): string {
  let msg = err instanceof Error ? err.message : String(err);
  msg = msg.replace(
    /postgres(?:ql)?:\/\/[^\s)'"]+/gi,
    "postgresql://***",
  );
  msg = msg.replace(
    /neon-connection-string[^\s)'"]*/gi,
    "neon-connection-string:***",
  );
  msg = msg.replace(/password[=:]\s*\S+/gi, "password:***");
  return msg.slice(0, 240);
}

export function classifyDbError(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (
    msg.includes("password authentication") ||
    msg.includes("28p01") ||
    msg.includes("invalid password") ||
    msg.includes("role") && msg.includes("does not exist")
  ) {
    return "auth";
  }
  if (
    msg.includes("enotfound") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("timeout") ||
    msg.includes("aborted")
  ) {
    return "network";
  }
  if (
    msg.includes("does not exist") ||
    msg.includes("undefined_table") ||
    msg.includes("undefined_column") ||
    msg.includes("invalid input value for enum") ||
    msg.includes("42703") ||
    msg.includes("42p01")
  ) {
    return "schema";
  }
  if (msg.includes("db-pg") || msg.includes("cannot find module") || msg.includes("sidecar")) {
    return "sidecar";
  }
  return "unknown";
}
