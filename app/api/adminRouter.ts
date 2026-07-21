import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { insertReturningId } from "./queries/insert-id";
import { getDb } from "./queries/connection";
import {
  coupons,
  invoices,
  persons,
  treeMembers,
  trees,
  users,
  subscriptionPlans,
  expenses,
  paymentGateways,
} from "@db/tables";
import {
  EXPENSE_CATEGORIES,
  INVOICE_STATUS,
  SUBSCRIPTION_PLANS,
  USER_ROLES,
} from "@contracts/constants";
import { ensurePlatformDefaults } from "./seedDefaults";
import { formatInvoiceNumber, nextSequence } from "./sequences";
import { applySubscriptionPlan } from "./subscriptionHelpers";
import { fulfillInvoice } from "./payments/fulfillment";
import { logAdminAction } from "./lib/admin-audit";
import { getClientIp } from "./lib/client-ip";
import { encryptGatewayConfig, decryptGatewayConfig } from "./lib/crypto";
import { parseGatewayConfig } from "./payments/gatewayConfig";
import { incrementSessionVersion } from "./queries/users";

function userSummary(user: typeof users.$inferSelect, ownedTrees = 0) {
  return {
    id: user.id,
    unionId: user.unionId,
    username: user.username,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    plan: user.plan ?? "free",
    planStartedAt: user.planStartedAt,
    planExpiresAt: user.planExpiresAt,
    userNumber: user.userNumber,
    referralCode: user.referralCode,
    phone: user.phone,
    city: user.city,
    country: user.country,
    lastSignInIp: user.lastSignInIp,
    registrationIp: user.registrationIp,
    isBanned: user.isBanned,
    banReason: user.banReason,
    createdAt: user.createdAt,
    lastSignInAt: user.lastSignInAt,
    ownedTrees,
  };
}

async function countOwnedTrees(db: ReturnType<typeof getDb>, userIds: number[]) {
  if (userIds.length === 0) return new Map<number, number>();
  const rows = await db
    .select({ ownerId: trees.ownerId })
    .from(trees)
    .where(inArray(trees.ownerId, userIds));
  const map = new Map<number, number>();
  for (const id of userIds) map.set(id, 0);
  for (const r of rows) {
    map.set(r.ownerId, (map.get(r.ownerId) ?? 0) + 1);
  }
  return map;
}

export const adminRouter = createRouter({
  getStats: adminQuery.query(async () => {
    await ensurePlatformDefaults();
    const db = getDb();
    const allUsers = await db.select().from(users);
    const treeRows = await db.select({ id: trees.id }).from(trees);
    const personRows = await db
      .select({ id: persons.id })
      .from(persons)
      .where(isNull(persons.deletedAt));
    const invoiceRows = await db.select().from(invoices);

    const plans = { free: 0, plus: 0, print: 0 };
    let admins = 0;
    let bannedUsers = 0;
    for (const u of allUsers) {
      const p = (u.plan ?? "free") as keyof typeof plans;
      if (p in plans) plans[p]++;
      if (u.role === "admin") admins++;
      if (u.isBanned) bannedUsers++;
    }

    const expenseRows = await db.select().from(expenses);
    const totalExpenses = expenseRows.reduce((s, e) => s + e.amount, 0);

    const paidInvoices = invoiceRows.filter((i) => i.status === "paid");
    const pendingInvoices = invoiceRows.filter((i) => i.status === "pending");
    const revenue = paidInvoices.reduce((sum, i) => sum + i.amount, 0);

    return {
      totalUsers: allUsers.length,
      totalAdmins: admins,
      bannedUsers,
      totalTrees: treeRows.length,
      totalPersons: personRows.length,
      plans,
      invoices: {
        total: invoiceRows.length,
        paid: paidInvoices.length,
        pending: pendingInvoices.length,
        revenue,
      },
      accounting: {
        revenue,
        expenses: totalExpenses,
        profit: revenue - totalExpenses,
      },
    };
  }),

  listUsers: adminQuery
    .input(
      z.object({
        search: z.string().max(128).optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const term = input.search?.trim();
      const where = term
        ? or(
            like(users.name, `%${term}%`),
            like(users.email, `%${term}%`),
            like(users.phone, `%${term}%`),
          )
        : undefined;

      const rows = await db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countRow = await db
        .select({ n: sql<number>`count(*)` })
        .from(users)
        .where(where);
      const total = Number(countRow[0]?.n ?? 0);

      const treeCounts = await countOwnedTrees(
        db,
        rows.map((u) => u.id),
      );

      return {
        total,
        items: rows.map((u) => userSummary(u, treeCounts.get(u.id) ?? 0)),
      };
    }),

  getUser: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      const memberships = await db
        .select({ treeId: treeMembers.treeId, role: treeMembers.role })
        .from(treeMembers)
        .where(eq(treeMembers.userId, input.id));

      const treeIds = memberships.map((m) => m.treeId);
      let ownedTrees = 0;
      let totalPersons = 0;

      if (treeIds.length > 0) {
        const treeRows = await db
          .select()
          .from(trees)
          .where(inArray(trees.id, treeIds));
        ownedTrees = treeRows.filter((t) => t.ownerId === input.id).length;

        const counts = await db
          .select({ id: persons.id })
          .from(persons)
          .where(and(inArray(persons.treeId, treeIds), isNull(persons.deletedAt)));
        totalPersons = counts.length;
      }

      const userInvoices = await db
        .select()
        .from(invoices)
        .where(eq(invoices.userId, input.id))
        .orderBy(desc(invoices.issuedAt));

      return {
        profile: {
          id: user.id,
          unionId: user.unionId,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          plan: user.plan ?? "free",
          planExpiresAt: user.planExpiresAt,
          phone: user.phone,
          addressLine1: user.addressLine1,
          addressLine2: user.addressLine2,
          city: user.city,
          addressRegion: user.addressRegion,
          country: user.country,
          billingEmail: user.billingEmail,
          username: user.username,
          lastSignInIp: user.lastSignInIp,
          registrationIp: user.registrationIp,
          isBanned: user.isBanned,
          banReason: user.banReason,
          createdAt: user.createdAt,
          lastSignInAt: user.lastSignInAt,
        },
        usage: {
          memberships: memberships.length,
          ownedTrees,
          totalPersons,
        },
        invoices: userInvoices,
      };
    }),

  updateUser: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().max(320).nullish(),
        phone: z.string().max(32).nullish(),
        role: z.enum(USER_ROLES).optional(),
        plan: z.enum(SUBSCRIPTION_PLANS).optional(),
        planExpiresAt: z.coerce.date().nullish(),
        addressLine1: z.string().max(255).nullish(),
        addressLine2: z.string().max(255).nullish(),
        city: z.string().max(128).nullish(),
        addressRegion: z.string().max(128).nullish(),
        country: z.string().length(2).nullish(),
        billingEmail: z.string().email().max(320).nullish(),
        username: z.string().max(64).nullish(),
        isBanned: z.boolean().optional(),
        banReason: z.string().max(500).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      if (
        input.id === ctx.user.id &&
        input.role === "user" &&
        existing.role === "admin"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "لا يمكنك إزالة صلاحية المشرف عن حسابك",
        });
      }

      const planChanged =
        input.plan !== undefined && input.plan !== existing.plan;

      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name;
      if (input.email !== undefined) patch.email = input.email;
      if (input.phone !== undefined) patch.phone = input.phone;
      if (input.role !== undefined) patch.role = input.role;
      if (input.plan !== undefined && !planChanged) patch.plan = input.plan;
      if (input.planExpiresAt !== undefined && !planChanged) {
        patch.planExpiresAt = input.planExpiresAt;
      }
      if (input.addressLine1 !== undefined) patch.addressLine1 = input.addressLine1;
      if (input.addressLine2 !== undefined) patch.addressLine2 = input.addressLine2;
      if (input.city !== undefined) patch.city = input.city;
      if (input.addressRegion !== undefined) patch.addressRegion = input.addressRegion;
      if (input.country !== undefined) patch.country = input.country;
      if (input.billingEmail !== undefined) patch.billingEmail = input.billingEmail;
      if (input.username !== undefined) patch.username = input.username;
      if (input.isBanned !== undefined) {
        patch.isBanned = input.isBanned;
        patch.bannedAt = input.isBanned ? new Date() : null;
        if (!input.isBanned) patch.banReason = null;
      }
      if (input.banReason !== undefined) patch.banReason = input.banReason;

      const banning = input.isBanned === true && !existing.isBanned;
      const unbanning = input.isBanned === false && existing.isBanned;

      if (Object.keys(patch).length > 0) {
        await db.update(users).set(patch).where(eq(users.id, input.id));
      }

      if (banning) {
        await incrementSessionVersion(input.id);
        await logAdminAction({
          adminUserId: ctx.user.id,
          action: "ban_user",
          targetType: "user",
          targetId: String(input.id),
          details: input.banReason ?? undefined,
          ip: getClientIp(ctx.req.headers),
        });
      } else if (unbanning) {
        await logAdminAction({
          adminUserId: ctx.user.id,
          action: "unban_user",
          targetType: "user",
          targetId: String(input.id),
          ip: getClientIp(ctx.req.headers),
        });
      }

      if (planChanged && input.plan) {
        await applySubscriptionPlan(input.id, input.plan);
      } else if (planChanged === false && input.planExpiresAt !== undefined) {
        await db
          .update(users)
          .set({ planExpiresAt: input.planExpiresAt })
          .where(eq(users.id, input.id));
      }

      return { ok: true };
    }),

  listInvoices: adminQuery
    .input(
      z.object({
        status: z.enum(INVOICE_STATUS).optional(),
        userId: z.number().int().positive().optional(),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [];
      if (input.status) filters.push(eq(invoices.status, input.status));
      if (input.userId) filters.push(eq(invoices.userId, input.userId));
      const where = filters.length > 0 ? and(...filters) : undefined;

      const rows = await db
        .select({
          invoice: invoices,
          userName: users.name,
          userEmail: users.email,
        })
        .from(invoices)
        .innerJoin(users, eq(invoices.userId, users.id))
        .where(where)
        .orderBy(desc(invoices.issuedAt))
        .limit(input.limit)
        .offset(input.offset);

      const countRow = await db
        .select({ n: sql<number>`count(*)` })
        .from(invoices)
        .where(where);
      const total = Number(countRow[0]?.n ?? 0);

      return {
        total,
        items: rows.map((r) => ({
          ...r.invoice,
          userName: r.userName,
          userEmail: r.userEmail,
        })),
      };
    }),

  createInvoice: adminQuery
    .input(
      z.object({
        userId: z.number().int().positive(),
        description: z.string().min(1).max(512),
        amount: z.number().int().positive(),
        currency: z.string().length(3).default("OMR"),
        status: z.enum(INVOICE_STATUS).default("pending"),
        number: z.string().max(64).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "المستخدم غير موجود" });
      }

      const seq = await nextSequence("invoice");
      const number = input.number?.trim() || formatInvoiceNumber(seq);

      const id = await insertReturningId(invoices, {
        userId: input.userId,
        number,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        status: input.status === "paid" ? "pending" : input.status,
        paidAt: null,
      });

      const row = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, id))
        .then((rows) => rows[0]);
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (input.status === "paid") {
        await fulfillInvoice(id);
      }
      await logAdminAction({
        adminUserId: ctx.user.id,
        action: "create_invoice",
        targetType: "invoice",
        targetId: number,
        details: `${input.amount} ${input.currency} — ${input.description}`,
        ip: getClientIp(ctx.req.headers),
      });
      return (
        (await db.select().from(invoices).where(eq(invoices.id, id)).then((r) => r[0])) ??
        row
      );
    }),

  updateInvoice: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        description: z.string().min(1).max(512).optional(),
        amount: z.number().int().positive().optional(),
        status: z.enum(INVOICE_STATUS).optional(),
        paidAt: z.coerce.date().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, input.id))
        .then((rows) => rows[0]);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "الفاتورة غير موجودة" });
      }

      const patch: Record<string, unknown> = {};
      if (input.description !== undefined) patch.description = input.description;
      if (input.amount !== undefined) patch.amount = input.amount;
      if (input.status !== undefined) {
        patch.status = input.status;
        if (input.status === "paid" && !input.paidAt && !existing.paidAt) {
          patch.paidAt = new Date();
        }
        if (input.status !== "paid") patch.paidAt = input.paidAt ?? null;
      }
      if (input.paidAt !== undefined) patch.paidAt = input.paidAt;

      const markingPaid = input.status === "paid" && existing.status !== "paid";
      if (markingPaid) {
        await fulfillInvoice(input.id);
        delete patch.status;
        delete patch.paidAt;
        await logAdminAction({
          adminUserId: ctx.user.id,
          action: "mark_invoice_paid",
          targetType: "invoice",
          targetId: existing.number,
          ip: getClientIp(ctx.req.headers),
        });
      }

      if (Object.keys(patch).length === 0) return { ok: true };

      await db.update(invoices).set(patch).where(eq(invoices.id, input.id));

      return { ok: true };
    }),

  listPlans: adminQuery.query(async () => {
    await ensurePlatformDefaults();
    const db = getDb();
    return db
      .select()
      .from(subscriptionPlans)
      .orderBy(subscriptionPlans.sortOrder);
  }),

  updatePlan: adminQuery
    .input(
      z.object({
        slug: z.enum(SUBSCRIPTION_PLANS),
        nameAr: z.string().min(1).max(128).optional(),
        nameEn: z.string().min(1).max(128).optional(),
        maxTrees: z.number().int().min(0).nullish(),
        maxPersonsPerTree: z.number().int().min(0).nullish(),
        maxPersonsTotal: z.number().int().min(0).nullish(),
        priceYearly: z.number().int().min(0).optional(),
        periodDays: z.number().int().min(1).optional(),
        renewalDiscountPercent: z.number().int().min(0).max(100).optional(),
        includesPrint: z.boolean().optional(),
        requiresPayment: z.boolean().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { slug, ...data } = input;
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) patch[k] = v;
      }
      if (Object.keys(patch).length === 0) return { ok: true };
      await db
        .update(subscriptionPlans)
        .set(patch)
        .where(eq(subscriptionPlans.slug, slug));
      return { ok: true };
    }),

  getAccounting: adminQuery.query(async () => {
    const db = getDb();
    const invoiceRows = await db.select().from(invoices);
    const expenseRows = await db.select().from(expenses).orderBy(desc(expenses.incurredAt));

    const revenue = invoiceRows
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.amount, 0);
    const pending = invoiceRows
      .filter((i) => i.status === "pending")
      .reduce((s, i) => s + i.amount, 0);
    const totalExpenses = expenseRows.reduce((s, e) => s + e.amount, 0);

    return {
      revenue,
      pending,
      expenses: totalExpenses,
      profit: revenue - totalExpenses,
      recentExpenses: expenseRows.slice(0, 10),
      recentPaidInvoices: invoiceRows
        .filter((i) => i.status === "paid")
        .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
        .slice(0, 10),
    };
  }),

  listExpenses: adminQuery
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(expenses)
        .orderBy(desc(expenses.incurredAt))
        .limit(input.limit)
        .offset(input.offset);
      const countRow = await db
        .select({ n: sql<number>`count(*)` })
        .from(expenses);
      return { total: Number(countRow[0]?.n ?? 0), items: rows };
    }),

  createExpense: adminQuery
    .input(
      z.object({
        description: z.string().min(1).max(512),
        amount: z.number().int().positive(),
        currency: z.string().length(3).default("OMR"),
        category: z.enum(EXPENSE_CATEGORIES).default("other"),
        incurredAt: z.coerce.date().optional(),
        notes: z.string().max(2000).nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const id = await insertReturningId(expenses, {
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        category: input.category,
        incurredAt: input.incurredAt ?? new Date(),
        notes: input.notes ?? null,
        createdByUserId: ctx.user.id,
      });
      const row = await db
        .select()
        .from(expenses)
        .where(eq(expenses.id, id))
        .then((r) => r[0]);
      return row!;
    }),

  updateExpense: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        description: z.string().min(1).max(512).optional(),
        amount: z.number().int().positive().optional(),
        category: z.enum(EXPENSE_CATEGORIES).optional(),
        incurredAt: z.coerce.date().optional(),
        notes: z.string().max(2000).nullish(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined) patch[k] = v;
      }
      if (Object.keys(patch).length === 0) return { ok: true };
      await db.update(expenses).set(patch).where(eq(expenses.id, id));
      return { ok: true };
    }),

  deleteExpense: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(expenses).where(eq(expenses.id, input.id));
      return { ok: true };
    }),

  listPaymentGateways: adminQuery.query(async () => {
    await ensurePlatformDefaults();
    const db = getDb();
    const rows = await db
      .select()
      .from(paymentGateways)
      .orderBy(paymentGateways.sortOrder);
    return rows.map((g) => ({
      ...g,
      config: decryptGatewayConfig(parseGatewayConfig(g.configJson)),
    }));
  }),

  updatePaymentGateway: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        isEnabled: z.boolean().optional(),
        isTestMode: z.boolean().optional(),
        config: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(paymentGateways)
        .where(eq(paymentGateways.id, input.id))
        .then((r) => r[0]);
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "بوابة الدفع غير موجودة" });
      }
      const patch: Record<string, unknown> = {};
      if (input.isEnabled !== undefined) patch.isEnabled = input.isEnabled;
      if (input.isTestMode !== undefined) patch.isTestMode = input.isTestMode;
      if (input.config !== undefined) {
        const stored = parseGatewayConfig(existing.configJson);
        const current = decryptGatewayConfig(stored);
        const merged: Record<string, string> = { ...current };
        for (const [k, v] of Object.entries(input.config)) {
          const isSecret = /secret|webhooksecret/i.test(k);
          if (isSecret && !v.trim()) continue;
          merged[k] = v;
        }
        patch.configJson = JSON.stringify(encryptGatewayConfig(merged));
      }
      if (Object.keys(patch).length === 0) return { ok: true };
      await db
        .update(paymentGateways)
        .set(patch)
        .where(eq(paymentGateways.id, input.id));
      await logAdminAction({
        adminUserId: ctx.user.id,
        action: "update_payment_gateway",
        targetType: "gateway",
        targetId: existing.slug,
        details: [
          input.isEnabled !== undefined ? `enabled=${input.isEnabled}` : null,
          input.isTestMode !== undefined ? `test=${input.isTestMode}` : null,
          input.config !== undefined ? "config_updated" : null,
        ]
          .filter(Boolean)
          .join(", "),
        ip: getClientIp(ctx.req.headers),
      });
      return { ok: true };
    }),

  getPaymentGateway: adminQuery
    .input(z.object({ slug: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      await ensurePlatformDefaults();
      const db = getDb();
      const row = await db
        .select()
        .from(paymentGateways)
        .where(eq(paymentGateways.slug, input.slug))
        .then((r) => r[0]);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "بوابة الدفع غير موجودة" });
      }
      return {
        ...row,
        config: decryptGatewayConfig(parseGatewayConfig(row.configJson)),
      };
    }),

  listCoupons: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }),

  createCoupon: adminQuery
    .input(
      z.object({
        code: z.string().min(2).max(64),
        description: z.string().max(512).optional(),
        discountType: z.enum(["percent", "fixed"]).default("percent"),
        discountValue: z.number().int().positive(),
        appliesTo: z.enum(["new", "renewal", "all"]).default("all"),
        planSlug: z.enum(SUBSCRIPTION_PLANS).optional(),
        maxUses: z.number().int().positive().optional(),
        validUntil: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(coupons).values({
        code: input.code.trim().toUpperCase(),
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        appliesTo: input.appliesTo,
        planSlug: input.planSlug ?? null,
        maxUses: input.maxUses ?? null,
        validUntil: input.validUntil ?? null,
      });
      return { ok: true };
    }),
});
