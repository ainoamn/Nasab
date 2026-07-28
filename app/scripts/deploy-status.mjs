#!/usr/bin/env node
/**
 * Compare live /api/health build SHA to local git HEAD (or origin/main).
 * Usage:
 *   node scripts/deploy-status.mjs
 *   node scripts/deploy-status.mjs https://nasab-mu.vercel.app
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");
const base = (process.argv[2] || "https://nasab-mu.vercel.app").replace(/\/$/, "");

function gitSha(cwd, ref) {
  const r = spawnSync("git", ["rev-parse", "--short", ref], {
    cwd,
    encoding: "utf8",
  });
  return r.status === 0 ? (r.stdout || "").trim() : "";
}

const localSha = gitSha(repoRoot, "HEAD") || gitSha(root, "HEAD");
const originSha =
  gitSha(repoRoot, "origin/main") ||
  gitSha(repoRoot, "origin/master") ||
  localSha;

let live = null;
try {
  const res = await fetch(`${base}/api/health`);
  live = await res.json();
} catch (e) {
  console.error("FAIL fetch health", e?.message || e);
  process.exit(1);
}

const liveBuild = live?.build || null;
const expected = originSha || localSha;
const inSync = Boolean(liveBuild && expected && liveBuild === expected);

console.log("══ DEPLOY STATUS ══");
console.log({
  base,
  liveBuild,
  localHead: localSha || null,
  originMain: originSha || null,
  inSync,
  next: inSync
    ? "Live matches git — OK"
    : "Live SHA behind git → Vercel Deployments → Redeploy (Root Directory = app)",
});

// Avoid process.exit(n) on Windows after fetch (libuv assert); set exitCode instead.
process.exitCode = inSync ? 0 : 2;
