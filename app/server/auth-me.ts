import type { Context } from "hono";
import { authenticateRequest } from "./kimi/auth";

function productIdentityId(user: {
  id: number | string;
  bhdSub?: string | null;
  unionId?: string | null;
}) {
  if (user.bhdSub) return String(user.bhdSub);
  const unionId = user.unionId || "";
  if (unionId.startsWith("bhd:")) return unionId.slice(4);
  return String(user.id);
}

/** قراءة الجلسة فقط — بلا Set-Cookie (docs/BHD-SESSION-POLICY.md) */
export function createAuthMeHandler() {
  return async (c: Context) => {
    try {
      const user = await authenticateRequest(c.req.raw.headers);
      const bhdSub = user.bhdSub ? String(user.bhdSub) : null;
      return c.json({
        ok: true,
        user: {
          /** يطابق `user.id` من هوية BHD عند الربط — لـ BhdSilentSso */
          id: productIdentityId(user),
          localId: user.id,
          bhdSub,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch {
      return c.json({ error: "unauthorized" }, 401);
    }
  };
}
