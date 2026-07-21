import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { treeRouter } from "./treeRouter";
import { personRouter } from "./personRouter";
import { memberRouter } from "./memberRouter";
import { logRouter } from "./logRouter";
import { userRouter } from "./userRouter";
import { adminRouter } from "./adminRouter";

import { paymentRouter } from "./paymentRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  user: userRouter,
  payment: paymentRouter,
  admin: adminRouter,
  tree: treeRouter,
  person: personRouter,
  member: memberRouter,
  log: logRouter,
});

export type AppRouter = typeof appRouter;
