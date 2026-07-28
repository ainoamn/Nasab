#!/usr/bin/env node
/**
 * Production smoke checks against a deployed Nasab URL.
 * Usage: node scripts/prod-smoke.mjs [https://nasab-mu.vercel.app]
 */
const base = (process.argv[2] || "https://nasab-mu.vercel.app").replace(/\/$/, "");
const GITHUB_MAIN =
  "https://api.github.com/repos/ainoamn/Nasab/commits/main";

async function get(path) {
  const t0 = Date.now();
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return {
    path,
    status: res.status,
    ms: Date.now() - t0,
    json,
    text: text.slice(0, 200),
    headers: {
      nosniff: res.headers.get("x-content-type-options"),
      frame: res.headers.get("x-frame-options"),
    },
  };
}

async function post(path, body, contentType) {
  const t0 = Date.now();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* */
  }
  return { path, status: res.status, ms: Date.now() - t0, json, text: text.slice(0, 200) };
}

async function fetchOriginMainSha() {
  try {
    const res = await fetch(GITHUB_MAIN, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return null;
    const d = await res.json();
    return typeof d?.sha === "string" ? d.sha.slice(0, 7) : null;
  } catch {
    return null;
  }
}

const results = [];
results.push(await get("/api/health"));
results.push(await get("/api/diag"));
results.push(await get("/api/trpc/auth.config"));
results.push(
  await post(
    "/api/auth/password-login",
    "username=probe&password=probe",
    "application/x-www-form-urlencoded",
  ),
);
results.push(await get("/login"));
results.push(await get("/setup"));

for (const r of results) {
  const flag =
    r.path === "/api/diag"
      ? `dbConfigured=${r.json?.dbConfigured} sidecar=${r.json?.sidecar}`
      : r.json?.error || r.json?.ok || r.json?.result || "";
  console.log(
    `${r.status}\t${r.ms}ms\t${r.path}\t${typeof flag === "object" ? JSON.stringify(flag) : flag}`,
  );
}

const diag = results.find((r) => r.path === "/api/diag")?.json;
const health = results.find((r) => r.path === "/api/health");
const healthOk = health?.status === 200;
const login = results.find((r) => r.path === "/api/auth/password-login");
const headersOk =
  health?.headers?.nosniff === "nosniff" &&
  String(health?.headers?.frame || "").toUpperCase() === "DENY";

const liveBuild = health?.json?.build || diag?.build || null;
const originMain = await fetchOriginMainSha();
const deployInSync = Boolean(liveBuild && originMain && liveBuild === originMain);

console.log("\nVERDICT");
console.log({
  base,
  healthOk,
  liveBuild,
  originMain,
  deployInSync,
  dbConfigured: Boolean(diag?.dbConfigured),
  hasAppSecret: Boolean(diag?.hasAppSecret),
  sidecar: Boolean(diag?.sidecar),
  loginResponds: Boolean(login && login.status !== 0 && login.ms < 14000),
  loginStatus: login?.status,
  loginError: login?.json?.error,
  setupOk: results.find((r) => r.path === "/setup")?.status === 200,
  securityHeadersOk: headersOk,
  nextStep: !deployInSync
    ? "Live SHA behind GitHub main → Vercel Deployments → Redeploy (Root Directory = app)"
    : diag?.dbConfigured
      ? "Try /login with admin credentials"
      : "Set DATABASE_URL + APP_SECRET on Vercel, then Redeploy (see UPGRADE.md)",
});

process.exit(healthOk ? 0 : 1);
