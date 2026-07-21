import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { changeLogs, users } from "@db/tables";
import { requireTreeRole } from "./permissions";

export const logRouter = createRouter({
  /** آخر 100 حدث في الشجرة مع أسماء المنفذين */
  list: authedQuery
    .input(z.object({ treeId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "viewer");
      return db
        .select({
          id: changeLogs.id,
          action: changeLogs.action,
          details: changeLogs.details,
          personId: changeLogs.personId,
          createdAt: changeLogs.createdAt,
          userName: users.name,
        })
        .from(changeLogs)
        .innerJoin(users, eq(changeLogs.userId, users.id))
        .where(eq(changeLogs.treeId, input.treeId))
        .orderBy(desc(changeLogs.createdAt))
        .limit(100);
    }),
});
