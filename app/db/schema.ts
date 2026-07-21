import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  boolean,
  int,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  phone: varchar("phone", { length: 32 }),
  addressLine1: varchar("addressLine1", { length: 255 }),
  addressLine2: varchar("addressLine2", { length: 255 }),
  city: varchar("city", { length: 128 }),
  addressRegion: varchar("addressRegion", { length: 128 }),
  country: varchar("country", { length: 2 }).default("OM"),
  plan: mysqlEnum("plan", ["free", "plus", "print"]).default("free").notNull(),
  planStartedAt: timestamp("planStartedAt"),
  planExpiresAt: timestamp("planExpiresAt"),
  userNumber: int("userNumber").unique(),
  referralCode: varchar("referralCode", { length: 32 }).unique(),
  referredByUserId: bigint("referredByUserId", { mode: "number", unsigned: true }),
  billingEmail: varchar("billingEmail", { length: 320 }),
  username: varchar("username", { length: 64 }),
  lastSignInIp: varchar("lastSignInIp", { length: 45 }),
  registrationIp: varchar("registrationIp", { length: 45 }),
  isBanned: boolean("isBanned").default(false).notNull(),
  banReason: text("banReason"),
  bannedAt: timestamp("bannedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* ───────────────────────── شجرة العائلة ───────────────────────── */

export const trees = mysqlTable(
  "trees",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    tribe: varchar("tribe", { length: 255 }),
    region: varchar("region", { length: 255 }),
    description: text("description"),
    ownerId: bigint("ownerId", { mode: "number", unsigned: true }).notNull(),
    // خصوصية الشجرة: خاصة / برابط سري / عامة
    visibility: mysqlEnum("visibility", ["private", "unlisted", "public"])
      .default("private")
      .notNull(),
    // عرض أسماء الإناث للغرباء: كامل / الاسم الأول فقط / إخفاء
    femaleDisplay: mysqlEnum("femaleDisplay", ["full", "firstOnly", "hidden"])
      .default("full")
      .notNull(),
    // إخفاء بيانات الأحياء عن الغرباء
    hideLiving: boolean("hideLiving").default(true).notNull(),
    status: mysqlEnum("status", ["active", "paused", "archived"])
      .default("active")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    ownerIdx: index("trees_owner_idx").on(table.ownerId),
  }),
);

export type Tree = typeof trees.$inferSelect;
export type InsertTree = typeof trees.$inferInsert;

/* ───────────────────────── الأشخاص ───────────────────────── */

export const persons = mysqlTable(
  "persons",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number", unsigned: true }).notNull(),
    givenName: varchar("givenName", { length: 255 }).notNull(),
    // النسب النصي المتسلسل: "بن فلان بن فلان"
    fatherName: varchar("fatherName", { length: 500 }),
    kunya: varchar("kunya", { length: 255 }), // الكنية: أبو فلان
    laqab: varchar("laqab", { length: 255 }), // اللقب / الشهرة
    clan: varchar("clan", { length: 255 }), // البطن / الفخذ
    gender: mysqlEnum("gender", ["male", "female"]).notNull(),
    birthDay: int("birthDay"),
    birthMonth: int("birthMonth"),
    birthYear: int("birthYear"),
    birthPlace: varchar("birthPlace", { length: 255 }),
    deathDay: int("deathDay"),
    deathMonth: int("deathMonth"),
    deathYear: int("deathYear"),
    deathPlace: varchar("deathPlace", { length: 255 }),
    isLiving: boolean("isLiving").default(true).notNull(),
    // خصوصية الشخص: خاص بي / العائلة / الأشجار المرتبطة / عام
    privacy: mysqlEnum("privacy", ["private", "family", "linked", "public"])
      .default("family")
      .notNull(),
    photoUrl: text("photoUrl"),
    notes: text("notes"),
    branchId: bigint("branchId", { mode: "number", unsigned: true }),
    createdById: bigint("createdById", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    // حذف ناعم — قابل للاسترجاع
    deletedAt: timestamp("deletedAt"),
  },
  (table) => ({
    treeIdx: index("persons_tree_idx").on(table.treeId),
    nameIdx: index("persons_name_idx").on(table.givenName),
  }),
);

export type Person = typeof persons.$inferSelect;
export type InsertPerson = typeof persons.$inferInsert;

/* ───────────────────────── العلاقات ───────────────────────── */
// parent: من = الأب/الأم ، إلى = الابن
// spouse: علاقة زواج بين شخصين

export const relationships = mysqlTable(
  "relationships",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number", unsigned: true }).notNull(),
    fromPersonId: bigint("fromPersonId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    toPersonId: bigint("toPersonId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    type: mysqlEnum("type", ["parent", "spouse"]).notNull(),
    marriageDay: int("marriageDay"),
    marriageMonth: int("marriageMonth"),
    marriageYear: int("marriageYear"),
    divorceDay: int("divorceDay"),
    divorceMonth: int("divorceMonth"),
    divorceYear: int("divorceYear"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    treeIdx: index("rel_tree_idx").on(table.treeId),
    fromIdx: index("rel_from_idx").on(table.fromPersonId),
    toIdx: index("rel_to_idx").on(table.toPersonId),
  }),
);

export type Relationship = typeof relationships.$inferSelect;
export type InsertRelationship = typeof relationships.$inferInsert;

/* ───────────────────────── أعضاء الشجرة وأدوارهم ───────────────────────── */

export const treeMembers = mysqlTable(
  "tree_members",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number", unsigned: true }).notNull(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    // مالك / مشرف / محرر / مشاهد
    role: mysqlEnum("role", ["owner", "admin", "editor", "viewer"]).notNull(),
    invitedById: bigint("invitedById", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
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

/* ───────────────────────── الدعوات ───────────────────────── */

export const invites = mysqlTable(
  "invites",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number", unsigned: true }).notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    role: mysqlEnum("role", ["admin", "editor", "viewer"]).notNull(),
    createdById: bigint("createdById", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedById: bigint("acceptedById", { mode: "number", unsigned: true }),
    acceptedAt: timestamp("acceptedAt"),
    revoked: boolean("revoked").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    treeIdx: index("invites_tree_idx").on(table.treeId),
  }),
);

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;

/* ───────────────────────── سجل التغييرات (تدقيق) ───────────────────────── */

export const changeLogs = mysqlTable(
  "change_logs",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number", unsigned: true }).notNull(),
    personId: bigint("personId", { mode: "number", unsigned: true }),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    action: varchar("action", { length: 60 }).notNull(),
    details: text("details"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    treeIdx: index("logs_tree_idx").on(table.treeId),
  }),
);

export type ChangeLog = typeof changeLogs.$inferSelect;
export type InsertChangeLog = typeof changeLogs.$inferInsert;

export const treeBranches = mysqlTable(
  "tree_branches",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number", unsigned: true }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    rootPersonId: bigint("rootPersonId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    isHidden: boolean("isHidden").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    treeIdx: index("branches_tree_idx").on(table.treeId),
  }),
);

export type TreeBranch = typeof treeBranches.$inferSelect;
export type InsertTreeBranch = typeof treeBranches.$inferInsert;

export const personLinks = mysqlTable(
  "person_links",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number", unsigned: true }).notNull(),
    localPersonId: bigint("localPersonId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    remoteTreeId: bigint("remoteTreeId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    remotePersonId: bigint("remotePersonId", {
      mode: "number",
      unsigned: true,
    }).notNull(),
    linkType: mysqlEnum("linkType", ["spouse", "same_person"])
      .default("spouse")
      .notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    localIdx: index("plinks_local_idx").on(table.treeId, table.localPersonId),
    remoteIdx: index("plinks_remote_idx").on(
      table.remoteTreeId,
      table.remotePersonId,
    ),
    uniq: uniqueIndex("plinks_uniq").on(
      table.treeId,
      table.localPersonId,
      table.remoteTreeId,
      table.remotePersonId,
    ),
  }),
);

export const invoices = mysqlTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    number: varchar("number", { length: 64 }).notNull(),
    description: varchar("description", { length: 512 }).notNull(),
    amount: int("amount").notNull(),
    currency: varchar("currency", { length: 8 }).default("OMR").notNull(),
    status: mysqlEnum("status", ["paid", "pending", "cancelled"])
      .default("pending")
      .notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    paidAt: timestamp("paidAt"),
    pdfUrl: text("pdfUrl"),
    gatewaySlug: varchar("gatewaySlug", { length: 32 }),
    planSlug: mysqlEnum("planSlug", ["free", "plus", "print"]),
    externalPaymentId: varchar("externalPaymentId", { length: 255 }),
    checkoutUrl: text("checkoutUrl"),
    metadataJson: text("metadataJson"),
  },
  (table) => ({
    userIdx: index("invoices_user_idx").on(table.userId),
    numberUniq: uniqueIndex("invoices_number_uniq").on(table.number),
  }),
);

export type PersonLink = typeof personLinks.$inferSelect;
export type InsertPersonLink = typeof personLinks.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

export const subscriptionPlans = mysqlTable("subscription_plans", {
  slug: mysqlEnum("slug", ["free", "plus", "print"]).primaryKey(),
  nameAr: varchar("nameAr", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  maxTrees: int("maxTrees"),
  maxPersonsPerTree: int("maxPersonsPerTree"),
  maxPersonsTotal: int("maxPersonsTotal"),
  priceYearly: int("priceYearly").default(0).notNull(),
  periodDays: int("periodDays").default(365).notNull(),
  renewalDiscountPercent: int("renewalDiscountPercent").default(0).notNull(),
  includesPrint: boolean("includesPrint").default(false).notNull(),
  requiresPayment: boolean("requiresPayment").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlanRow = typeof subscriptionPlans.$inferInsert;

export const expenses = mysqlTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    description: varchar("description", { length: 512 }).notNull(),
    amount: int("amount").notNull(),
    currency: varchar("currency", { length: 8 }).default("OMR").notNull(),
    category: mysqlEnum("category", [
      "hosting",
      "marketing",
      "salaries",
      "operations",
      "other",
    ])
      .default("other")
      .notNull(),
    incurredAt: timestamp("incurredAt").defaultNow().notNull(),
    notes: text("notes"),
    createdByUserId: bigint("createdByUserId", {
      mode: "number",
      unsigned: true,
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    incurredIdx: index("expenses_incurred_idx").on(table.incurredAt),
  }),
);

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

export const paymentGateways = mysqlTable(
  "payment_gateways",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    nameAr: varchar("nameAr", { length: 128 }).notNull(),
    nameEn: varchar("nameEn", { length: 128 }).notNull(),
    isEnabled: boolean("isEnabled").default(false).notNull(),
    isTestMode: boolean("isTestMode").default(true).notNull(),
    configJson: text("configJson").notNull().default("{}"),
    sortOrder: int("sortOrder").default(0).notNull(),
  },
  (table) => ({
    slugUniq: uniqueIndex("pgw_slug_uniq").on(table.slug),
  }),
);

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = typeof paymentGateways.$inferInsert;

export const platformSequences = mysqlTable("platform_sequences", {
  key: varchar("key", { length: 32 }).primaryKey(),
  nextValue: int("nextValue").notNull().default(1),
});

export const coupons = mysqlTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    description: varchar("description", { length: 512 }),
    discountType: mysqlEnum("discountType", ["percent", "fixed"])
      .default("percent")
      .notNull(),
    discountValue: int("discountValue").notNull(),
    appliesTo: mysqlEnum("appliesTo", ["new", "renewal", "all"])
      .default("all")
      .notNull(),
    planSlug: mysqlEnum("planSlug", ["free", "plus", "print"]),
    maxUses: int("maxUses"),
    usedCount: int("usedCount").default(0).notNull(),
    validFrom: timestamp("validFrom"),
    validUntil: timestamp("validUntil"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    codeUniq: uniqueIndex("coupons_code_uniq").on(table.code),
  }),
);

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

export const couponRedemptions = mysqlTable("coupon_redemptions", {
  id: serial("id").primaryKey(),
  couponId: bigint("couponId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  discountApplied: int("discountApplied").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PersonLink = typeof personLinks.$inferSelect;
