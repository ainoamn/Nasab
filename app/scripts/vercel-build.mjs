#!/usr/bin/env node
/**
 * Vercel Build Output API (v3):
 * - static site → .vercel/output/static
 * - one Node function → .vercel/output/functions/api.func
 */
import { build } from "esbuild";
import {
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, ".vercel", "output");

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

console.log("[vercel-build] bundling serverless api.func…");
await build({
  entryPoints: [path.join(root, "server", "vercel.ts")],
  outfile: path.join(out, "functions", "api.func", "index.js"),
  platform: "node",
  format: "esm",
  bundle: true,
  packages: "external",
  absWorkingDir: root,
  alias: {
    "@db": path.join(root, "db"),
    "@contracts": path.join(root, "contracts"),
    "@": path.join(root, "src"),
  },
});

writeFileSync(
  path.join(out, "functions", "api.func", "package.json"),
  JSON.stringify({ type: "module" }, null, 2),
);

writeFileSync(
  path.join(out, "functions", "api.func", ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.js",
      launcherType: "Nodejs",
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
