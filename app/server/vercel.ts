/**
 * Vercel serverless entry — bundled to api/index.js during npm run build.
 */
import { handle } from "hono/vercel";
import app from "./boot";

export default handle(app);

// Seed plans/gateways on cold start (non-blocking).
void import("./seedDefaults")
  .then((m) => m.ensurePlatformDefaults())
  .then(() => console.log("[nasab] platform defaults ready"))
  .catch((err) => console.error("[nasab] seed failed:", err));
