import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  unionId: text("unionId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  avatar: text("avatar"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  phone: text("phone"),
  addressLine1: text("addressLine1"),
  addressLine2: text("addressLine2"),
  city: text("city"),
  addressRegion: text("addressRegion"),
  country: text("country").default("OM"),
  plan: text("plan", { enum: ["free", "plus", "print"] })
    .default("free")
    .notNull(),
  planStartedAt: integer("planStartedAt", { mode: "timestamp" }),
  planExpiresAt: integer("planExpiresAt", { mode: "timestamp" }),
  userNumber: integer("userNumber").unique(),
  referralCode: text("referralCode").unique(),
  referredByUserId: integer("referredByUserId"),
  billingEmail: text("billingEmail"),
  username: text("username"),
  lastSignInIp: text("lastSignInIp"),
  registrationIp: text("registrationIp"),
  isBanned: integer("isBanned", { mode: "boolean" }).default(false).notNull(),
  banReason: text("banReason"),
  bannedAt: integer("bannedAt", { mode: "timestamp" }),
  sessionVersion: integer("sessionVersion").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
  lastSignInAt: integer("lastSignInAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const trees = sqliteTable(
  "trees",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    tribe: text("tribe"),
    region: text("region"),
    description: text("description"),
    ownerId: integer("ownerId").notNull(),
    visibility: text("visibility", { enum: ["private", "unlisted", "public"] })
      .default("private")
      .notNull(),
    femaleDisplay: text("femaleDisplay", {
      enum: ["full", "firstOnly", "hidden"],
    })
      .default("full")
      .notNull(),
    hideLiving: integer("hideLiving", { mode: "boolean" })
      .default(true)
      .notNull(),
    status: text("status", { enum: ["active", "paused", "archived"] })
      .default("active")
      .notNull(),
    shareToken: text("shareToken").unique(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    ownerIdx: index("trees_owner_idx").on(table.ownerId),
  }),
);

export type Tree = typeof trees.$inferSelect;
export type InsertTree = typeof trees.$inferInsert;

export const persons = sqliteTable(
  "persons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    treeId: integer("treeId").notNull(),
    givenName: text("givenName").notNull(),
    fatherName: text("fatherName"),
    kunya: text("kunya"),
    laqab: text("laqab"),
    clan: text("clan"),
    gender: text("gender", { enum: ["male", "female"] }).notNull(),
    birthDay: integer("birthDay"),
    birthMonth: integer("birthMonth"),
    birthYear: integer("birthYear"),
    birthPlace: text("birthPlace"),
    deathDay: integer("deathDay"),
    deathMonth: integer("deathMonth"),
    deathYear: integer("deathYear"),
    deathPlace: text("deathPlace"),
    isLiving: integer("isLiving", { mode: "boolean" }).default(true).notNull(),
    privacy: text("privacy", {
      enum: ["private", "family", "linked", "public"],
    })
      .default("family")
      .notNull(),
    photoUrl: text("photoUrl"),
    notes: text("notes"),
    /** فرع نسب خارجي (عائلة الأم مثلاً) */
    branchId: integer("branchId"),
    createdById: integer("createdById").notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
    deletedAt: integer("deletedAt", { mode: "timestamp" }),
  },
  (table) => ({
    treeIdx: index("persons_tree_idx").on(table.treeId),
    nameIdx: index("persons_name_idx").on(table.givenName),
  }),
);

export type Person = typeof persons.$inferSelect;
export type InsertPerson = typeof persons.$inferInsert;

export const relationships = sqliteTable(
  "relationships",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    treeId: integer("treeId").notNull(),
    fromPersonId: integer("fromPersonId").notNull(),
    toPersonId: integer("toPersonId").notNull(),
    type: text("type", { enum: ["parent", "spouse"] }).notNull(),
    marriageDay: integer("marriageDay"),
    marriageMonth: integer("marriageMonth"),
    marriageYear: integer("marriageYear"),
    divorceDay: integer("divorceDay"),
    divorceMonth: integer("divorceMonth"),
    divorceYear: integer("divorceYear"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    treeIdx: index("rel_tree_idx").on(table.treeId),
    fromIdx: index("rel_from_idx").on(table.fromPersonId),
    toIdx: index("rel_to_idx").on(table.toPersonId),
  }),
);

export type Relationship = typeof relationships.$inferSelect;
export type InsertRelationship = typeof relationships.$inferInsert;

export const treeMembers = sqliteTable(
  "tree_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    treeId: integer("treeId").notNull(),
    userId: integer("userId").notNull(),
    role: text("role", {
      enum: ["owner", "admin", "editor", "viewer"],
    }).notNull(),
    invitedById: integer("invitedById"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    uniqTreeUser: uniqueIndex("members_tree_user_uniq").on(
      table.treeId,
      table.userId,
    ),
    userIdx: index("members_user_idx").on(table.userId),
  }),
);

export type TreeMember = typeof treeMembers.$inferSelect;
export type InsertTreeMember = typeof treeMembers.$inferInsert;

export const invites = sqliteTable(
  "invites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    treeId: integer("treeId").notNull(),
    token: text("token").notNull().unique(),
    role: text("role", { enum: ["admin", "editor", "viewer"] }).notNull(),
    createdById: integer("createdById").notNull(),
    expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
    acceptedById: integer("acceptedById"),
    acceptedAt: integer("acceptedAt", { mode: "timestamp" }),
    revoked: integer("revoked", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    treeIdx: index("invites_tree_idx").on(table.treeId),
  }),
);

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;

export const changeLogs = sqliteTable(
  "change_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    treeId: integer("treeId").notNull(),
    personId: integer("personId"),
    userId: integer("userId").notNull(),
    action: text("action").notNull(),
    details: text("details"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    treeIdx: index("logs_tree_idx").on(table.treeId),
  }),
);

export type ChangeLog = typeof changeLogs.$inferSelect;
export type InsertChangeLog = typeof changeLogs.$inferInsert;

/** فروع نسبية (عائلة خارجية / خط الأم) */
export const treeBranches = sqliteTable(
  "tree_branches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    treeId: integer("treeId").notNull(),
    name: text("name").notNull(),
    rootPersonId: integer("rootPersonId").notNull(),
    isHidden: integer("isHidden", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    treeIdx: index("branches_tree_idx").on(table.treeId),
  }),
);

export type TreeBranch = typeof treeBranches.$inferSelect;
export type InsertTreeBranch = typeof treeBranches.$inferInsert;

/** ربط شخص بشخص في شجرة أخرى (زوج/نفس الشخص) */
export const personLinks = sqliteTable(
  "person_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    treeId: integer("treeId").notNull(),
    localPersonId: integer("localPersonId").notNull(),
    remoteTreeId: integer("remoteTreeId").notNull(),
    remotePersonId: integer("remotePersonId").notNull(),
    linkType: text("linkType", { enum: ["spouse", "same_person"] })
      .default("spouse")
      .notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    localIdx: index("plinks_local_idx").on(table.treeId, table.localPersonId),
    remoteIdx: index("plinks_remote_idx").on(table.remoteTreeId, table.remotePersonId),
    uniq: uniqueIndex("plinks_uniq").on(
      table.treeId,
      table.localPersonId,
      table.remoteTreeId,
      table.remotePersonId,
    ),
  }),
);

export const invoices = sqliteTable(
  "invoices",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull(),
    number: text("number").notNull(),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").default("OMR").notNull(),
    status: text("status", { enum: ["paid", "pending", "cancelled"] })
      .default("pending")
      .notNull(),
    issuedAt: integer("issuedAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    paidAt: integer("paidAt", { mode: "timestamp" }),
    pdfUrl: text("pdfUrl"),
    gatewaySlug: text("gatewaySlug"),
    planSlug: text("planSlug", { enum: ["free", "plus", "print"] }),
    externalPaymentId: text("externalPaymentId"),
    checkoutUrl: text("checkoutUrl"),
    metadataJson: text("metadataJson"),
  },
  (table) => ({
    userIdx: index("invoices_user_idx").on(table.userId),
    numberUniq: uniqueIndex("invoices_number_uniq").on(table.number),
  }),
);

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const subscriptionPlans = sqliteTable("subscription_plans", {
  slug: text("slug", { enum: ["free", "plus", "print"] }).primaryKey(),
  nameAr: text("nameAr").notNull(),
  nameEn: text("nameEn").notNull(),
  maxTrees: integer("maxTrees"),
  maxPersonsPerTree: integer("maxPersonsPerTree"),
  maxPersonsTotal: integer("maxPersonsTotal"),
  priceYearly: integer("priceYearly").default(0).notNull(),
  periodDays: integer("periodDays").default(365).notNull(),
  renewalDiscountPercent: integer("renewalDiscountPercent").default(0).notNull(),
  includesPrint: integer("includesPrint", { mode: "boolean" })
    .default(false)
    .notNull(),
  requiresPayment: integer("requiresPayment", { mode: "boolean" })
    .default(false)
    .notNull(),
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
});

export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlanRow = typeof subscriptionPlans.$inferInsert;

export const expenses = sqliteTable(
  "expenses",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    description: text("description").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").default("OMR").notNull(),
    category: text("category", {
      enum: ["hosting", "marketing", "salaries", "operations", "other"],
    })
      .default("other")
      .notNull(),
    incurredAt: integer("incurredAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    notes: text("notes"),
    createdByUserId: integer("createdByUserId"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    incurredIdx: index("expenses_incurred_idx").on(table.incurredAt),
  }),
);

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

export const paymentGateways = sqliteTable(
  "payment_gateways",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    nameAr: text("nameAr").notNull(),
    nameEn: text("nameEn").notNull(),
    isEnabled: integer("isEnabled", { mode: "boolean" }).default(false).notNull(),
    isTestMode: integer("isTestMode", { mode: "boolean" }).default(true).notNull(),
    configJson: text("configJson").default("{}").notNull(),
    sortOrder: integer("sortOrder").default(0).notNull(),
  },
  (table) => ({
    slugUniq: uniqueIndex("pgw_slug_uniq").on(table.slug),
  }),
);

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = typeof paymentGateways.$inferInsert;

export const platformSequences = sqliteTable("platform_sequences", {
  key: text("key").primaryKey(),
  nextValue: integer("nextValue").notNull().default(1),
});

export const coupons = sqliteTable(
  "coupons",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull().unique(),
    description: text("description"),
    discountType: text("discountType", { enum: ["percent", "fixed"] })
      .default("percent")
      .notNull(),
    discountValue: integer("discountValue").notNull(),
    appliesTo: text("appliesTo", { enum: ["new", "renewal", "all"] })
      .default("all")
      .notNull(),
    planSlug: text("planSlug", { enum: ["free", "plus", "print"] }),
    maxUses: integer("maxUses"),
    usedCount: integer("usedCount").default(0).notNull(),
    validFrom: integer("validFrom", { mode: "timestamp" }),
    validUntil: integer("validUntil", { mode: "timestamp" }),
    isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    codeUniq: uniqueIndex("coupons_code_uniq").on(table.code),
  }),
);

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

export const couponRedemptions = sqliteTable("coupon_redemptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  couponId: integer("couponId").notNull(),
  userId: integer("userId").notNull(),
  discountApplied: integer("discountApplied").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type PersonLink = typeof personLinks.$inferSelect;
export type InsertPersonLink = typeof personLinks.$inferInsert;

export const adminAuditLogs = sqliteTable(
  "admin_audit_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    adminUserId: integer("adminUserId").notNull(),
    action: text("action").notNull(),
    targetType: text("targetType"),
    targetId: text("targetId"),
    details: text("details"),
    ip: text("ip"),
    createdAt: integer("createdAt", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    adminIdx: index("admin_audit_admin_idx").on(table.adminUserId),
  }),
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;

export const platformSettings = sqliteTable("platform_settings", {
  id: integer("id").primaryKey().default(1),
  companyNameAr: text("companyNameAr"),
  companyNameEn: text("companyNameEn"),
  logoUrl: text("logoUrl"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxNumber: text("taxNumber"),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformSettings = typeof platformSettings.$inferInsert;
