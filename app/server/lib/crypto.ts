import crypto from "node:crypto";
import { env } from "./env";

const SECRET_FIELDS = ["secretkey", "clientsecret", "webhooksecret"];
const ENC_PREFIX = "enc:v1:";

function deriveKey(): Buffer {
  return crypto.createHash("sha256").update(env.appSecret).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain || plain.startsWith(ENC_PREFIX)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", deriveKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${enc.toString("base64url")}`;
}

export function decryptSecret(stored: string): string {
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  const raw = stored.slice(ENC_PREFIX.length);
  const [ivB64, tagB64, dataB64] = raw.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return stored;
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function encryptGatewayConfig(config: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(config)) {
    out[k] = SECRET_FIELDS.some((s) => k.toLowerCase().includes(s)) ? encryptSecret(v) : v;
  }
  return out;
}

export function decryptGatewayConfig(config: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(config)) {
    out[k] = SECRET_FIELDS.some((s) => k.toLowerCase().includes(s)) ? decryptSecret(v) : v;
  }
  return out;
}
