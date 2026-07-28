#!/usr/bin/env node
/**
 * Vercel Build Output API (v3):
 * - static site → .vercel/output/static
 * - one Node function → .vercel/output/functions/api.func
 *
 * Bundle ALL JS deps into the function (Build Output does not ship node_modules).
 */
import { build } from "esbuild";
import {
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  appendFileSync,
  existsSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".vercel", "output");

function gitSha() {
  const r = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: path.resolve(root, ".."),
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status === 0 && r.stdout?.trim()) return r.stdout.trim();
  const r2 = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r2.status === 0 ? (r2.stdout || "").trim() || "unknown" : "unknown";
}

const buildSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || gitSha();
const buildTime = new Date().toISOString();
console.log(`[vercel-build] build ${buildSha} @ ${buildTime}`);

function run(cmd, args) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("[vercel-build] vite build…");
run("npx", ["vite", "build"]);

console.log("[vercel-build] node server bundle (Docker/VPS)…");
run("npm", ["run", "build:server"]);

rmSync(out, { recursive: true, force: true });
mkdirSync(path.join(out, "static"), { recursive: true });
mkdirSync(path.join(out, "functions", "api.func"), { recursive: true });

const staticSrc = path.join(root, "dist", "public");
if (!existsSync(staticSrc)) {
  console.error("[vercel-build] missing dist/public");
  process.exit(1);
}
cpSync(staticSrc, path.join(out, "static"), { recursive: true });

console.log("[vercel-build] bundling serverless api.func (full bundle)…");
const funcDir = path.join(out, "functions", "api.func");
const funcOut = path.join(funcDir, "index.js");
await build({
  entryPoints: [path.join(root, "server", "vercel.ts")],
  outfile: funcOut,
  platform: "node",
  format: "cjs",
  bundle: true,
  absWorkingDir: root,
  external: ["better-sqlite3", "mysql2", "./db-pg.cjs"],
  define: {
    "process.env.NASAB_SERVERLESS": '"1"',
    "process.env.NASAB_BUILD_SHA": JSON.stringify(buildSha),
    "process.env.NASAB_BUILD_TIME": JSON.stringify(buildTime),
  },
  alias: {
    "@db": path.join(root, "db"),
    "@contracts": path.join(root, "contracts"),
    "@": path.join(root, "src"),
  },
  logOverride: {
    "empty-import-meta": "silent",
  },
});

console.log("[vercel-build] bundling db-pg.cjs (Postgres sidecar)…");
await build({
  entryPoints: [path.join(root, "server", "queries", "db-pg.ts")],
  outfile: path.join(funcDir, "db-pg.cjs"),
  platform: "node",
  format: "cjs",
  bundle: true,
  absWorkingDir: root,
});

// Force CommonJS inside the function package (repo root is "type": "module").
writeFileSync(
  path.join(funcDir, "package.json"),
  JSON.stringify({ type: "commonjs" }, null, 2),
);

appendFileSync(
  funcOut,
  `\nmodule.exports = typeof nasabHandler !== "undefined" ? nasabHandler : (typeof vercel_default !== "undefined" ? vercel_default : module.exports.default);\n`,
);

writeFileSync(
  path.join(out, "functions", "api.func", ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.js",
      launcherType: "Nodejs",
      // false: getRequestListener owns the Node req stream; Vercel body helpers
      // previously left POST bodies hanging (tRPC .input / c.req.json).
      shouldAddHelpers: false,
      maxDuration: 30,
      memory: 1024,
    },
    null,
    2,
  ),
);

writeFileSync(
  path.join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/api(?:/.*)?", dest: "/api" },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2,
  ),
);

console.log("[vercel-build] done → .vercel/output");
