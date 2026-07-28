import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { invites, treeMembers, trees, users } from "@db/tables";
import { getMemberRole, logChange, requireTreeRole, roleAtLeast } from "./permissions";
import { INVITE_ROLES, TREE_ROLES, type TreeRole } from "@contracts/constants";
import { rateLimit, clientRateKey } from "./lib/rate-limit";
import { getClientIp } from "./lib/client-ip";

export const memberRouter = createRouter({
  /** أعضاء الشجرة مع أسمائهم */
  list: authedQuery
    .input(z.object({ treeId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const myRole = await requireTreeRole(ctx.user.id, input.treeId, "viewer");
      const rows = await db
        .select({
          id: treeMembers.id,
          role: treeMembers.role,
          createdAt: treeMembers.createdAt,
          userId: users.id,
          userName: users.name,
          userEmail: users.email,
          userAvatar: users.avatar,
        })
        .from(treeMembers)
        .innerJoin(users, eq(treeMembers.userId, users.id))
        .where(eq(treeMembers.treeId, input.treeId));
      return { members: rows, myRole };
    }),

  /** إنشاء دعوة برابط سري */
  createInvite: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        role: z.enum(INVITE_ROLES),
        expiresInDays: z.number().int().min(1).max(90).default(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ip = getClientIp(ctx.req.headers);
      const rl = rateLimit({
        key: clientRateKey("create-invite", ip ?? String(ctx.user.id)),
        limit: 20,
        windowMs: 60 * 60 * 1000,
      });
      if (!rl.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "محاولات كثيرة — حاول لاحقاً",
        });
      }
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "admin");
      const token = randomBytes(24).toString("hex");
      const expiresAt = new Date(
        Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000,
      );
      await db.insert(invites).values({
        treeId: input.treeId,
        token,
        role: input.role,
        createdById: ctx.user.id,
        expiresAt,
      });
      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        action: "create_invite",
        details: `أنشأ دعوة بدور "${input.role}"`,
      });
      return { token, expiresAt };
    }),

  listInvites: authedQuery
    .input(z.object({ treeId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "admin");
      return db
        .select()
        .from(invites)
        .where(eq(invites.treeId, input.treeId));
    }),

  revokeInvite: authedQuery
    .input(z.object({ id: z.number().int().positive(), treeId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await requireTreeRole(ctx.user.id, input.treeId, "admin");
      await db
        .update(invites)
        .set({ revoked: true })
        .where(and(eq(invites.id, input.id), eq(invites.treeId, input.treeId)));
      return { ok: true };
    }),

  /** معاينة الدعوة (عامة): اسم الشجرة والدور — دون كشف بيانات */
  inviteInfo: publicQuery
    .input(z.object({ token: z.string().min(10).max(64) }))
    .query(async ({ input }) => {
      const db = getDb();
      const invite = await db.query.invites.findFirst({
        where: eq(invites.token, input.token),
      });
      if (
        !invite ||
        invite.revoked ||
        invite.acceptedAt ||
        invite.expiresAt < new Date()
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "هذه الدعوة غير صالحة أو منتهية",
        });
      }
      const tree = await db.query.trees.findFirst({
        where: eq(trees.id, invite.treeId),
      });
      return {
        treeName: tree?.name ?? "شجرة عائلة",
        tribe: tree?.tribe ?? null,
        role: invite.role,
        expiresAt: invite.expiresAt,
      };
    }),

  /** قبول الدعوة — ينضم المستخدم الحالي للشجرة */
  acceptInvite: authedQuery
    .input(z.object({ token: z.string().min(10).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const ip = getClientIp(ctx.req.headers);
      const rl = rateLimit({
        key: clientRateKey("accept-invite", ip ?? String(ctx.user.id)),
        limit: 30,
        windowMs: 60 * 60 * 1000,
      });
      if (!rl.ok) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "محاولات كثيرة — حاول لاحقاً",
        });
      }
      const db = getDb();
      const invite = await db.query.invites.findFirst({
        where: eq(invites.token, input.token),
      });
      if (
        !invite ||
        invite.revoked ||
        invite.acceptedAt ||
        invite.expiresAt < new Date()
      ) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "هذه الدعوة غير صالحة أو منتهية",
        });
      }

      const tree = await db.query.trees.findFirst({
        where: eq(trees.id, invite.treeId),
      });
      if (!tree) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الشجرة غير موجودة" });
      }
      const status = tree.status ?? "active";
      if (status === "archived") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "الشجرة مؤرشفة — لا يمكن قبول الدعوة",
        });
      }
      if (status === "paused") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "الشجرة موقوفة مؤقتاً",
        });
      }

      const existingRole = await getMemberRole(ctx.user.id, invite.treeId);
      if (!existingRole) {
        await db.insert(treeMembers).values({
          treeId: invite.treeId,
          userId: ctx.user.id,
          role: invite.role,
          invitedById: invite.createdById,
        });
      }
      await db
        .update(invites)
        .set({ acceptedById: ctx.user.id, acceptedAt: new Date() })
        .where(eq(invites.id, invite.id));
      await logChange({
        treeId: invite.treeId,
        userId: ctx.user.id,
        action: "accept_invite",
        details: `انضم للشجرة بدور "${invite.role}"`,
      });
      return { treeId: invite.treeId, role: invite.role };
    }),

  /** تغيير دور عضو — للمالك والمشرف (المشرف لا يغير دور المالك) */
  updateRole: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        memberId: z.number().int().positive(),
        role: z.enum(TREE_ROLES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const myRole = await requireTreeRole(ctx.user.id, input.treeId, "admin");
      const target = await db.query.treeMembers.findFirst({
        where: and(
          eq(treeMembers.id, input.memberId),
          eq(treeMembers.treeId, input.treeId),
        ),
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.role === "owner" || input.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكن تغيير دور المالك",
        });
      }
      if (myRole === "admin" && (target.role === "admin" || input.role === "admin")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "المشرف لا يمكنه إدارة المشرفين",
        });
      }
      await db
        .update(treeMembers)
        .set({ role: input.role })
        .where(eq(treeMembers.id, input.memberId));
      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        action: "update_role",
        details: `غيّر دور عضو إلى "${input.role}"`,
      });
      return { ok: true };
    }),

  removeMember: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        memberId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const myRole = await requireTreeRole(ctx.user.id, input.treeId, "admin");
      const target = await db.query.treeMembers.findFirst({
        where: and(
          eq(treeMembers.id, input.memberId),
          eq(treeMembers.treeId, input.treeId),
        ),
      });
      if (!target) throw new TRPCError({ code: "NOT_FOUND" });
      if (target.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "لا يمكن إزالة مالك الشجرة",
        });
      }
      const isSelf = target.userId === ctx.user.id;
      if (!isSelf && myRole !== "owner" && target.role === "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "المشرف لا يمكنه إزالة مشرف آخر",
        });
      }
      await db.delete(treeMembers).where(eq(treeMembers.id, input.memberId));
      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        action: "remove_member",
        details: isSelf ? "غادر الشجرة" : "أزال عضواً من الشجرة",
      });
      return { ok: true };
    }),

  /** نقل الملكية — للمالك فقط */
  transferOwnership: authedQuery
    .input(
      z.object({
        treeId: z.number().int().positive(),
        memberId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const myRole = await requireTreeRole(ctx.user.id, input.treeId, "owner");
      const target = await db.query.treeMembers.findFirst({
        where: and(
          eq(treeMembers.id, input.memberId),
          eq(treeMembers.treeId, input.treeId),
        ),
      });
      if (!target || target.userId === ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "العضو غير موجود" });
      }
      // المالك الحالي يصبح مشرفاً
      await db
        .update(treeMembers)
        .set({ role: "admin" })
        .where(
          and(
            eq(treeMembers.treeId, input.treeId),
            eq(treeMembers.userId, ctx.user.id),
          ),
        );
      await db
        .update(treeMembers)
        .set({ role: "owner" })
        .where(eq(treeMembers.id, input.memberId));
      await db
        .update(trees)
        .set({ ownerId: target.userId })
        .where(eq(trees.id, input.treeId));
      await logChange({
        treeId: input.treeId,
        userId: ctx.user.id,
        action: "transfer_ownership",
        details: "نقل ملكية الشجرة لعضو آخر",
      });
      void myRole;
      return { ok: true };
    }),
});

export type { TreeRole };
export { roleAtLeast };
