#!/usr/bin/env node
/**
 * ترقية مستخدم إلى مشرف.
 * الاستخدام:
 *   node scripts/promote-admin.mjs --union-id=xxx
 *   node scripts/promote-admin.mjs --email=you@example.com
 *   node scripts/promote-admin.mjs --id=1
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.production") });
dotenv.config({ path: path.join(root, ".env") });

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (!a.startsWith("--")) continue;
    const i = a.indexOf("=");
    if (i === -1) out[a.slice(2)] = true;
    else out[a.slice(2, i)] = a.slice(i + 1);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

async function main() {
  if (databaseUrl.startsWith("file:")) {
    const require = createRequire(import.meta.url);
    const Database = require("better-sqlite3");
    const dbPath = databaseUrl.replace(/^file:/, "");
    const db = new Database(dbPath);
    let user;
    if (args["union-id"]) {
      user = db.prepare("SELECT * FROM users WHERE unionId = ?").get(args["union-id"]);
    } else if (args.email) {
      user = db.prepare("SELECT * FROM users WHERE email = ?").get(args.email);
    } else if (args.id) {
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(args.id));
    } else {
      console.error("Provide --union-id= or --email= or --id=");
      process.exit(1);
    }
    if (!user) {
      console.error("User not found");
      process.exit(1);
    }
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(user.id);
    console.log(`✓ promoted user #${user.id} (${user.unionId}) to admin`);
    return;
  }

  if (/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    const postgres = (await import("postgres")).default;
    const clean = databaseUrl
      .replace(/([?&])channel_binding=[^&]*/gi, "")
      .replace(/\?&/, "?");
    const sql = postgres(clean, { prepare: false, max: 1 });
    let rows;
    if (args["union-id"]) {
      rows = await sql`SELECT * FROM users WHERE "unionId" = ${args["union-id"]} LIMIT 1`;
    } else if (args.email) {
      rows = await sql`SELECT * FROM users WHERE email = ${args.email} LIMIT 1`;
    } else if (args.id) {
      rows = await sql`SELECT * FROM users WHERE id = ${Number(args.id)} LIMIT 1`;
    } else {
      console.error("Provide --union-id= or --email= or --id=");
      process.exit(1);
    }
    const user = rows[0];
    if (!user) {
      console.error("User not found");
      process.exit(1);
    }
    await sql`UPDATE users SET role = 'admin' WHERE id = ${user.id}`;
    await sql.end({ timeout: 5 });
    console.log(`✓ promoted user #${user.id} (${user.unionId}) to admin`);
    return;
  }

  const mysql = await import("mysql2/promise");
  const conn = await mysql.createConnection(databaseUrl);
  let rows;
  if (args["union-id"]) {
    [rows] = await conn.query("SELECT * FROM users WHERE unionId = ? LIMIT 1", [
      args["union-id"],
    ]);
  } else if (args.email) {
    [rows] = await conn.query("SELECT * FROM users WHERE email = ? LIMIT 1", [
      args.email,
    ]);
  } else if (args.id) {
    [rows] = await conn.query("SELECT * FROM users WHERE id = ? LIMIT 1", [
      Number(args.id),
    ]);
  } else {
    console.error("Provide --union-id= or --email= or --id=");
    process.exit(1);
  }
  const user = rows[0];
  if (!user) {
    console.error("User not found");
    process.exit(1);
  }
  await conn.query("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
  await conn.end();
  console.log(`✓ promoted user #${user.id} (${user.unionId}) to admin`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
