/**
 * Vercel Node.js serverless entry (Build Output API).
 * Exports a Node (IncomingMessage, ServerResponse) listener.
 */
import { getRequestListener } from "@hono/node-server";
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./boot";

const listener = getRequestListener(app.fetch);

let seeded = false;
function seedInBackground() {
  if (seeded) return;
  const url = process.env.DATABASE_URL ?? "";
  if (!url || url.startsWith("file:") || !/^postgres/i.test(url)) return;
  seeded = true;
  // Detach from the request lifecycle so login/health are not held open.
  setTimeout(() => {
    void import("./seedDefaults")
      .then((m) => m.ensurePlatformDefaults())
      .then(() => console.log("[nasab] platform defaults ready"))
      .catch((err) => {
        seeded = false;
        console.error("[nasab] seed failed:", err);
      });
  }, 25);
}

function nasabHandler(req: IncomingMessage, res: ServerResponse) {
  // Seed only on health probes — never block auth/login paths.
  if ((req.url ?? "").includes("/api/health")) {
    seedInBackground();
  }
  return listener(req, res);
}

export default nasabHandler;
