#!/usr/bin/env node
/**
 * Docker / production entrypoint:
 * wait for DB → drizzle-kit push → start boot.js
 */
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl) {
  console.error("[nasab] ERROR: DATABASE_URL is required");
  process.exit(1);
}

const secret = process.env.APP_SECRET ?? "";
if (!secret || secret.length < 32) {
  console.warn("[nasab] WARNING: APP_SECRET should be a random string of 32+ characters");
}
if (!process.env.OWNER_UNION_ID?.trim()) {
  console.warn(
    "[nasab] WARNING: OWNER_UNION_ID is empty — set it so the first owner login becomes admin",
  );
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...opts,
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`));
    });
  });
}

function sanitizePgUrl(url) {
  return url.replace(/([?&])channel_binding=[^&]*/gi, "").replace(/\?&/, "?");
}

async function waitForMysql(url, attempts = 40) {
  const mysql = await import("mysql2/promise");
  for (let i = 1; i <= attempts; i++) {
    try {
      const conn = await mysql.createConnection(url);
      await conn.query("SELECT 1");
      await conn.end();
      return;
    } catch {
      console.log(`[nasab] waiting for MySQL (${i}/${attempts})...`);
    }
    await delay(2000);
  }
  throw new Error("MySQL did not become ready in time");
}

async function waitForPostgres(url, attempts = 40) {
  const postgres = (await import("postgres")).default;
  const clean = sanitizePgUrl(url);
  for (let i = 1; i <= attempts; i++) {
    const sql = postgres(clean, { prepare: false, max: 1, connect_timeout: 5 });
    try {
      await sql`SELECT 1`;
      await sql.end({ timeout: 2 });
      return;
    } catch {
      try {
        await sql.end({ timeout: 1 });
      } catch {
        /* ignore */
      }
      console.log(`[nasab] waiting for Postgres (${i}/${attempts})...`);
    }
    await delay(2000);
  }
  throw new Error("Postgres did not become ready in time");
}

async function main() {
  console.log(`[nasab] starting entrypoint (NODE_ENV=${process.env.NODE_ENV ?? "unset"})`);

  if (/^mysql2?:\/\//i.test(databaseUrl)) {
    await waitForMysql(databaseUrl);
    console.log("[nasab] MySQL is ready — applying schema (drizzle-kit push)");
    await run("npx", ["drizzle-kit", "push", "--force"]);
  } else if (/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    await waitForPostgres(databaseUrl);
    console.log("[nasab] Postgres is ready — applying schema (drizzle-kit push)");
    await run("npx", ["drizzle-kit", "push", "--force"]);
  } else if (databaseUrl.startsWith("file:")) {
    console.log("[nasab] SQLite URL detected — applying schema");
    await run("npx", ["drizzle-kit", "push", "--force"]);
  } else {
    console.warn("[nasab] unknown DATABASE_URL dialect — skipping schema push");
  }

  console.log("[nasab] launching server");
  const boot = spawn(process.execPath, ["dist/boot.js"], {
    stdio: "inherit",
    env: process.env,
  });
  boot.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

main().catch((err) => {
  console.error("[nasab]", err instanceof Error ? err.message : err);
  process.exit(1);
});
