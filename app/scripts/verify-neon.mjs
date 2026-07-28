import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { sanitizeDatabaseUrl } from "../db/dialect.ts";

dotenv.config({ path: ".env.production", override: true });

const raw = process.env.DATABASE_URL || "";
if (!/^postgres/i.test(raw)) {
  console.error("FAIL: DATABASE_URL missing or not postgres");
  process.exit(1);
}

const url = sanitizeDatabaseUrl(raw);
const db = drizzle(neon(url));

const checks = [];

async function check(name, fn) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    checks.push({ name, ok: true, ms: Date.now() - t0, detail });
    console.log("OK ", name, detail ?? "");
  } catch (e) {
    checks.push({
      name,
      ok: false,
      ms: Date.now() - t0,
      error: e?.message || String(e),
    });
    console.error("FAIL", name, e?.message || e);
  }
}

await check("select1", async () => {
  const r = await db.execute(sql`select 1 as ok`);
  return r.rows?.[0] ?? r;
});

await check("tables", async () => {
  const r = await db.execute(sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `);
  const names = (r.rows || r).map((x) => x.table_name);
  return { count: names.length, names };
});

await check("admin_user", async () => {
  const r = await db.execute(sql`
    select id, email, role, plan, "unionId"
    from users
    where email = 'admin@bhd.om' or "unionId" = 'password:admin@bhd.om'
    limit 1
  `);
  const row = (r.rows || r)[0];
  if (!row) throw new Error("admin@bhd.om not found — run npm run admin:ensure");
  if (row.role !== "admin") throw new Error("admin role missing");
  return row;
});

await check("plans", async () => {
  const r = await db.execute(sql`select count(*)::int as n from subscription_plans`);
  return (r.rows || r)[0];
});

await check("gateways", async () => {
  const r = await db.execute(sql`select count(*)::int as n from payment_gateways`);
  return (r.rows || r)[0];
});

const failed = checks.filter((c) => !c.ok);
console.log("\nSUMMARY", {
  ok: failed.length === 0,
  passed: checks.filter((c) => c.ok).length,
  failed: failed.length,
});
process.exit(failed.length ? 1 : 0);
