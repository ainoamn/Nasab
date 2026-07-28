import { z } from "zod";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { persons, relationships, treeMembers, trees } from "@db/tables";
import { insertReturningId } from "./queries/insert-id";
import { logChange, requireTreeRole, getMemberRole, ensureTreeShareToken } from "./permissions";
import { generateShareToken } from "./lib/share-token";
import { TREE_VISIBILITY, FEMALE_DISPLAY, TREE_STATUS } from "@contracts/constants";
import { assertCanCreateTree } from "./planLimits";

const treeInput = z.object({
  name: z.string().min(1, "اسم الشجرة مطلوب").max(255),
  tribe: z.string().max(255).optional(),
  region: z.string().max(255).optional(),
  description: z.string().max(5000).optional(),
});

export const treeRouter = createRouter({
  /** أشجاري: التي أملكها + التي أنا عضو فيها */
  listMine: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const memberships = await db
      .select()
      .from(treeMembers)
      .where(eq(treeMembers.userId, ctx.user.id));
    if (memberships.length === 0) return [];
    const treeIds = memberships.map((m) => m.treeId);
    const rows = await db.select().from(trees).where(inArray(trees.id, treeIds));
    const roleByTree = new Map(memberships.map((m) => [m.treeId, m.role]));
    // عدد الأفراد لكل شجرة
    const result = await Promise.all(
      rows.map(async (t) => {
        const count = await db
          .select({ id: persons.id })
          .from(persons)
          .where(and(eq(persons.treeId, t.id), isNull(persons.deletedAt)));
        return {
          ...t,
          status: t.status ?? "active",
          myRole: roleByTree.get(t.id) ?? "viewer",
          personCount: count.length,
        };
      }),
    );
    return result.sort((a, b) => {
      const order = { active: 0, paused: 1, archived: 2 };
      const sa = order[(a.status as keyof typeof order) ?? "active"];
      const sb = order[(b.status as keyof typeof order) ?? "active"];
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(b.name, "ar");
    });
  }),

  create: authedQuery.input(treeInput).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await assertCanCreateTree(ctx.user.id);
    const id = await insertReturningId(trees, {
        name: input.name,
        tribe: input.tribe ?? null,
        region: input.region ?? null,
        description: input.description ?? null,
        ownerId: ctx.user.id,
        shareToken: generateShareToken(),
      });
    await db.insert(treeMembers).values({
      treeId: id,
      userId: ctx.user.id,
      role: "owner",
    });
    await logChange({
      treeId: id,
      userId: ctx.user.id,
      action: "create_tree",
      details: `أنشأ شجرة "${input.name}"`,
    });
    return { id };
  }),

  /** بيانات شجرة واحدة + دوري فيها (للأعضاء فقط) */
  get: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const role = await requireTreeRole(ctx.user.id, input.id, "viewer");
      const tree = await db.query.trees.findFirst({
        where: eq(trees.id, input.id),
      });
      if (!tree) throw new TRPCError({ code: "NOT_FOUND" });
      const status = tree.status ?? "active";
      if (status === "archived") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "هذه الشجرة مؤرشفة",
        });
      }
      const shareToken = await ensureTreeShareToken(input.id);
      return { ...tree, status, myRole: role, shareToken };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        tribe: z.string().max(255).nullish(),
        region: z.string().max(255).nullish(),
        description: z.string().max(5000).nullish(),
        visibility: z.enum(TREE_VISIBILITY).optional(),
        femaleDisplay: z.enum(FEMALE_DISPLAY).optional(),
        hideLiving: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.id, "admin");
      const { id, ...data } = input;
      const clean: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) clean[k] = v;
      }
      if (Object.keys(clean).length === 0) return { ok: true };
      await db.update(trees).set(clean).where(eq(trees.id, id));
      await logChange({
        treeId: id,
        userId: ctx.user.id,
        action: "update_tree",
        details: "حدّث إعدادات الشجرة",
      });
      return { ok: true };
    }),

  /** تعليق / أرشفة / استعادة الشجرة — للمالك فقط */
  setStatus: authedQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(TREE_STATUS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const role = await getMemberRole(ctx.user.id, input.id);
      if (role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "فقط مالك الشجرة يمكنه تغيير حالتها",
        });
      }
      const tree = await db.query.trees.findFirst({
        where: eq(trees.id, input.id),
      });
      if (!tree) throw new TRPCError({ code: "NOT_FOUND" });

      await db
        .update(trees)
        .set({ status: input.status })
        .where(eq(trees.id, input.id));

      const labels: Record<string, string> = {
        active: "تفعيل الشجرة",
        paused: "إيقاف الشجرة مؤقتاً",
        archived: "أرشفة الشجرة",
      };
      await logChange({
        treeId: input.id,
        userId: ctx.user.id,
        action: "tree_status",
        details: labels[input.status] ?? input.status,
      });
      return { ok: true, status: input.status };
    }),

  /** حذف الشجرة نهائياً — للمالك فقط */
  remove: authedQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const role = await getMemberRole(ctx.user.id, input.id);
      if (role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "فقط مالك الشجرة يمكنه حذفها",
        });
      }
      await db.delete(relationships).where(eq(relationships.treeId, input.id));
      await db.delete(persons).where(eq(persons.treeId, input.id));
      await db.delete(treeMembers).where(eq(treeMembers.treeId, input.id));
      await db.delete(trees).where(eq(trees.id, input.id));
      return { ok: true };
    }),
});
