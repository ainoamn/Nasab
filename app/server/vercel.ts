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
  if (!url || url.startsWith("file:")) return;
  seeded = true;
  void import("./seedDefaults")
    .then((m) => m.ensurePlatformDefaults())
    .then(() => console.log("[nasab] platform defaults ready"))
    .catch((err) => {
      seeded = false;
      console.error("[nasab] seed failed:", err);
    });
}

function nasabHandler(req: IncomingMessage, res: ServerResponse) {
  seedInBackground();
  return listener(req, res);
}

export default nasabHandler;
