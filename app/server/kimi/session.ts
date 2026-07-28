import * as jose from "jose";
import { env } from "../lib/env";
import type { SessionPayload } from "./types";

const JWT_ALG = "HS256";
const SESSION_TTL = "7d";

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
    });
    const unionId = payload.unionId as string | undefined;
    const clientId = payload.clientId as string | undefined;
    const sessionVersion = Number(payload.sessionVersion ?? 0);
    if (!unionId || !clientId) return null;
    return { unionId, clientId, sessionVersion };
  } catch {
    return null;
  }
}
