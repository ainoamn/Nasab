import crypto from "node:crypto";

export function generateShareToken() {
  return crypto.randomBytes(24).toString("hex");
}
