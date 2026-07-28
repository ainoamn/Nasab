#!/usr/bin/env node
/**
 * Combined launch status: Neon verify + live prod smoke + deploy SHA sync.
 * Usage: node scripts/launch-status.mjs
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(script) {
  console.log(`\n── ${script} ──`);
  const r = spawnSync("npm", ["run", script], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  return r.status === 0;
}

const neonOk = run("db:verify-neon");
const smokeOk = run("prod:smoke");
const deployOk = run("deploy:status");

console.log("\n══ LAUNCH STATUS ══");
console.log({
  neonLocal: neonOk ? "ok" : "FAIL",
  productionSmoke: smokeOk ? "ok" : "FAIL",
  deployInSync: deployOk ? "ok" : "BEHIND",
  next: !deployOk
    ? "Live SHA behind git → Vercel Deployments → Redeploy (Root Directory = app)"
    : "If production dbConfigured=false → npm run vercel:print-env → paste into Vercel → Redeploy",
});

process.exit(neonOk && smokeOk ? 0 : 1);
