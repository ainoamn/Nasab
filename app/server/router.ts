import { authRouter } from "./auth-router";
import { createRouter } from "./middleware";
import { treeRouter } from "./treeRouter";
import { personRouter } from "./personRouter";
import { memberRouter } from "./memberRouter";
import { logRouter } from "./logRouter";
import { userRouter } from "./userRouter";
import { adminRouter } from "./adminRouter";
import { platformRouter } from "./platformRouter";

import { paymentRouter } from "./paymentRouter";

export const appRouter = createRouter({
  auth: authRouter,
  user: userRouter,
  payment: paymentRouter,
  platform: platformRouter,
  admin: adminRouter,
  tree: treeRouter,
  person: personRouter,
  member: memberRouter,
  log: logRouter,
});

export type AppRouter = typeof appRouter;
