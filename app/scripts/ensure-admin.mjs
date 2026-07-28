#!/usr/bin/env node
/**
 * Ensure bootstrap admin exists in the configured DATABASE_URL (Neon/MySQL/SQLite).
 * Usage: node scripts/ensure-admin.mjs
 */
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.production") });
dotenv.config({ path: path.join(root, ".env") });

const email = (
  process.env.PASSWORD_LOGIN_EMAIL?.trim() || "admin@bhd.om"
).toLowerCase();
const unionId = `password:${email}`;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

async function main() {
  if (/^postgres/i.test(databaseUrl)) {
    const require = createRequire(import.meta.url);
    const postgres = require("postgres");
    const url = databaseUrl
      .replace(/([?&])channel_binding=[^&]*/gi, "")
      .replace(/\?&/, "?");
    const sql = postgres(url, { prepare: false, max: 1 });
    try {
      const existing = await sql`
        SELECT id, email, role FROM users WHERE "unionId" = ${unionId} LIMIT 1
      `;
      if (existing[0]) {
        await sql`
          UPDATE users
          SET role = 'admin',
              email = ${email},
              username = ${email},
              name = ${email.split("@")[0] || "Admin"},
              "updatedAt" = NOW()
          WHERE "unionId" = ${unionId}
        `;
        console.log(`OK updated admin #${existing[0].id} ${email}`);
      } else {
        const inserted = await sql`
          INSERT INTO users (
            "unionId", name, email, username, role, plan,
            "isBanned", "sessionVersion", "createdAt", "updatedAt", "lastSignInAt", country
          ) VALUES (
            ${unionId},
            ${email.split("@")[0] || "Admin"},
            ${email},
            ${email},
            'admin',
            'print',
            false,
            0,
            NOW(), NOW(), NOW(),
            'OM'
          )
          RETURNING id
        `;
        console.log(`OK created admin #${inserted[0].id} ${email}`);
      }
      const check = await sql`
        SELECT id, "unionId", email, role, plan FROM users WHERE "unionId" = ${unionId}
      `;
      console.log("admin row:", check[0]);
    } finally {
      await sql.end({ timeout: 5 });
    }
    return;
  }

  console.error("This helper currently supports PostgreSQL/Neon only.");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
