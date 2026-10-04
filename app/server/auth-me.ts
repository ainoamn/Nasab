import type { Context } from "hono";
import { authenticateRequest } from "./kimi/auth";

/** قراءة الجلسة فقط — بلا Set-Cookie (docs/BHD-SESSION-POLICY.md) */
export function createAuthMeHandler() {
  return async (c: Context) => {
    try {
      const user = await authenticateRequest(c.req.raw.headers);
      return c.json({
        ok: true,
        user: {
          id: user.id,
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
