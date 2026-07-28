#!/usr/bin/env node
/**
 * Combined launch status: Neon verify (advisory) + live prod smoke + deploy SHA sync.
 * Usage: node scripts/launch-status.mjs
 * Neon local failure does not fail the process — production env is the gate.
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
  neonLocal: neonOk ? "ok" : "WARN (advisory — local Neon optional)",
  productionSmoke: smokeOk ? "ok" : "FAIL",
  deployInSync: deployOk ? "ok" : "BEHIND",
  next: !deployOk
    ? "Live SHA behind git → Vercel Deployments → Redeploy (Root Directory = app)"
    : "If production dbConfigured=false → npm run vercel:print-env → paste into Vercel → Redeploy",
});

process.exit(smokeOk ? 0 : 1);
