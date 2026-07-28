/**
 * Vercel serverless entry — bundled to .vercel/output/functions/api.func
 */
import { handle } from "hono/vercel";
import app from "./boot";

const handler = handle(app);
export default handler;

void import("./seedDefaults")
  .then((m) => m.ensurePlatformDefaults())
  .then(() => console.log("[nasab] platform defaults ready"))
  .catch((err) => console.error("[nasab] seed failed:", err));
