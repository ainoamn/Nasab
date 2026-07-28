#!/usr/bin/env node
/**
 * Assert build fingerprint wiring is intact (source + optional vercel output).
 * Usage: node scripts/assert-build-fingerprint.mjs [--built]
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireBuilt = process.argv.includes("--built");

function mustContain(file, needle) {
  const p = path.join(root, file);
  if (!existsSync(p)) {
    console.error("MISSING", file);
    process.exit(1);
  }
  const text = readFileSync(p, "utf8");
  if (!text.includes(needle)) {
    console.error("MISSING needle", needle, "in", file);
    process.exit(1);
  }
  console.log("OK", file, "→", needle);
}

mustContain("scripts/vercel-build.mjs", "NASAB_BUILD_SHA");
mustContain("scripts/vercel-build.mjs", "NASAB_BUILD_TIME");
mustContain("server/boot.ts", "NASAB_BUILD_SHA");
mustContain("server/boot.ts", "NASAB_BUILD_TIME");

if (requireBuilt) {
  const funcDir = path.join(root, ".vercel", "output", "functions", "api.func");
  const indexJs = path.join(funcDir, "index.js");
  if (!existsSync(indexJs)) {
    console.error("MISSING built function — run: npm run build:vercel-output");
    process.exit(1);
  }
  const body = readFileSync(indexJs, "utf8");
  // esbuild define inlines the SHA string into the bundle
  const hasSha =
    /NASAB_BUILD_SHA/.test(body) ||
    /"build"\s*:\s*["'][0-9a-f]{7}/i.test(body) ||
    /builtAt/.test(body);
  if (!hasSha) {
    // Fallback: any short git-like hex literal near build
    const hexes = body.match(/"[0-9a-f]{7}"/gi) || [];
    if (hexes.length === 0) {
      console.error("Built api.func/index.js has no build fingerprint residue");
      process.exit(1);
    }
  }
  console.log("OK built api.func fingerprint residue");
  const files = readdirSync(funcDir);
  if (!files.includes("db-pg.cjs")) {
    console.error("MISSING db-pg.cjs sidecar in api.func");
    process.exit(1);
  }
  console.log("OK db-pg.cjs sidecar present");
}

console.log("Fingerprint wiring OK");
