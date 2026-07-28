import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const usersRoleEnum = pgEnum("users_role", ["user", "admin"]);
export const usersPlanEnum = pgEnum("users_plan", ["free", "plus", "print"]);
export const treesVisibilityEnum = pgEnum("trees_visibility", [
  "private",
  "unlisted",
  "public",
]);
export const treesFemaleDisplayEnum = pgEnum("trees_female_display", [
  "full",
  "firstOnly",
  "hidden",
]);
export const treesStatusEnum = pgEnum("trees_status", [
  "active",
  "paused",
  "archived",
]);
export const personsGenderEnum = pgEnum("persons_gender", ["male", "female"]);
export const personsPrivacyEnum = pgEnum("persons_privacy", [
  "private",
  "family",
  "linked",
  "public",
]);
export const relationshipsTypeEnum = pgEnum("relationships_type", [
  "parent",
  "spouse",
]);
export const treeMembersRoleEnum = pgEnum("tree_members_role", [
  "owner",
  "admin",
  "editor",
  "viewer",
]);
export const invitesRoleEnum = pgEnum("invites_role", [
  "admin",
  "editor",
  "viewer",
]);
export const personLinksTypeEnum = pgEnum("person_links_type", [
  "spouse",
  "same_person",
]);
export const invoicesStatusEnum = pgEnum("invoices_status", [
  "paid",
  "pending",
  "cancelled",
]);
export const planSlugEnum = pgEnum("plan_slug", ["free", "plus", "print"]);
export const expensesCategoryEnum = pgEnum("expenses_category", [
  "hosting",
  "marketing",
  "salaries",
  "operations",
  "other",
]);
export const couponsDiscountTypeEnum = pgEnum("coupons_discount_type", [
  "percent",
  "fixed",
]);
export const couponsAppliesToEnum = pgEnum("coupons_applies_to", [
  "new",
  "renewal",
  "all",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: usersRoleEnum("role").default("user").notNull(),
  phone: varchar("phone", { length: 32 }),
  addressLine1: varchar("addressLine1", { length: 255 }),
  addressLine2: varchar("addressLine2", { length: 255 }),
  city: varchar("city", { length: 128 }),
  addressRegion: varchar("addressRegion", { length: 128 }),
  country: varchar("country", { length: 2 }).default("OM"),
  plan: usersPlanEnum("plan").default("free").notNull(),
  planStartedAt: timestamp("planStartedAt"),
  planExpiresAt: timestamp("planExpiresAt"),
  userNumber: integer("userNumber").unique(),
  referralCode: varchar("referralCode", { length: 32 }).unique(),
  referredByUserId: bigint("referredByUserId", { mode: "number" }),
  billingEmail: varchar("billingEmail", { length: 320 }),
  username: varchar("username", { length: 64 }),
  lastSignInIp: varchar("lastSignInIp", { length: 45 }),
  registrationIp: varchar("registrationIp", { length: 45 }),
  isBanned: boolean("isBanned").default(false).notNull(),
  banReason: text("banReason"),
  bannedAt: timestamp("bannedAt"),
  sessionVersion: integer("sessionVersion").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const trees = pgTable(
  "trees",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    tribe: varchar("tribe", { length: 255 }),
    region: varchar("region", { length: 255 }),
    description: text("description"),
    ownerId: bigint("ownerId", { mode: "number" }).notNull(),
    visibility: treesVisibilityEnum("visibility").default("private").notNull(),
    femaleDisplay: treesFemaleDisplayEnum("femaleDisplay")
      .default("full")
      .notNull(),
    hideLiving: boolean("hideLiving").default(true).notNull(),
    status: treesStatusEnum("status").default("active").notNull(),
    shareToken: varchar("shareToken", { length: 64 }).unique(),
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

export const persons = pgTable(
  "persons",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number" }).notNull(),
    givenName: varchar("givenName", { length: 255 }).notNull(),
    fatherName: varchar("fatherName", { length: 500 }),
    kunya: varchar("kunya", { length: 255 }),
    laqab: varchar("laqab", { length: 255 }),
    clan: varchar("clan", { length: 255 }),
    gender: personsGenderEnum("gender").notNull(),
    birthDay: integer("birthDay"),
    birthMonth: integer("birthMonth"),
    birthYear: integer("birthYear"),
    birthPlace: varchar("birthPlace", { length: 255 }),
    deathDay: integer("deathDay"),
    deathMonth: integer("deathMonth"),
    deathYear: integer("deathYear"),
    deathPlace: varchar("deathPlace", { length: 255 }),
    isLiving: boolean("isLiving").default(true).notNull(),
    privacy: personsPrivacyEnum("privacy").default("family").notNull(),
    photoUrl: text("photoUrl"),
    notes: text("notes"),
    twinGroupId: integer("twinGroupId"),
    branchId: bigint("branchId", { mode: "number" }),
    createdById: bigint("createdById", { mode: "number" }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp("deletedAt"),
  },
  (table) => ({
    treeIdx: index("persons_tree_idx").on(table.treeId),
    nameIdx: index("persons_name_idx").on(table.givenName),
  }),
);

export type Person = typeof persons.$inferSelect;
export type InsertPerson = typeof persons.$inferInsert;

export const relationships = pgTable(
  "relationships",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number" }).notNull(),
    fromPersonId: bigint("fromPersonId", { mode: "number" }).notNull(),
    toPersonId: bigint("toPersonId", { mode: "number" }).notNull(),
    type: relationshipsTypeEnum("type").notNull(),
    marriageDay: integer("marriageDay"),
    marriageMonth: integer("marriageMonth"),
    marriageYear: integer("marriageYear"),
    divorceDay: integer("divorceDay"),
    divorceMonth: integer("divorceMonth"),
    divorceYear: integer("divorceYear"),
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

export const treeMembers = pgTable(
  "tree_members",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number" }).notNull(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    role: treeMembersRoleEnum("role").notNull(),
    invitedById: bigint("invitedById", { mode: "number" }),
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

export const invites = pgTable(
  "invites",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number" }).notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    role: invitesRoleEnum("role").notNull(),
    createdById: bigint("createdById", { mode: "number" }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    acceptedById: bigint("acceptedById", { mode: "number" }),
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

export const changeLogs = pgTable(
  "change_logs",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number" }).notNull(),
    personId: bigint("personId", { mode: "number" }),
    userId: bigint("userId", { mode: "number" }).notNull(),
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

export const treeBranches = pgTable(
  "tree_branches",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    rootPersonId: bigint("rootPersonId", { mode: "number" }).notNull(),
    isHidden: boolean("isHidden").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    treeIdx: index("branches_tree_idx").on(table.treeId),
  }),
);

export type TreeBranch = typeof treeBranches.$inferSelect;
export type InsertTreeBranch = typeof treeBranches.$inferInsert;

export const personLinks = pgTable(
  "person_links",
  {
    id: serial("id").primaryKey(),
    treeId: bigint("treeId", { mode: "number" }).notNull(),
    localPersonId: bigint("localPersonId", { mode: "number" }).notNull(),
    remoteTreeId: bigint("remoteTreeId", { mode: "number" }).notNull(),
    remotePersonId: bigint("remotePersonId", { mode: "number" }).notNull(),
    linkType: personLinksTypeEnum("linkType").default("spouse").notNull(),
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

export const invoices = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number" }).notNull(),
    number: varchar("number", { length: 64 }).notNull(),
    description: varchar("description", { length: 512 }).notNull(),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 8 }).default("OMR").notNull(),
    status: invoicesStatusEnum("status").default("pending").notNull(),
    issuedAt: timestamp("issuedAt").defaultNow().notNull(),
    paidAt: timestamp("paidAt"),
    pdfUrl: text("pdfUrl"),
    gatewaySlug: varchar("gatewaySlug", { length: 32 }),
    planSlug: planSlugEnum("planSlug"),
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

export const subscriptionPlans = pgTable("subscription_plans", {
  slug: planSlugEnum("slug").primaryKey(),
  nameAr: varchar("nameAr", { length: 128 }).notNull(),
  nameEn: varchar("nameEn", { length: 128 }).notNull(),
  maxTrees: integer("maxTrees"),
  maxPersonsPerTree: integer("maxPersonsPerTree"),
  maxPersonsTotal: integer("maxPersonsTotal"),
  priceYearly: integer("priceYearly").default(0).notNull(),
  periodDays: integer("periodDays").default(365).notNull(),
  renewalDiscountPercent: integer("renewalDiscountPercent").default(0).notNull(),
  includesPrint: boolean("includesPrint").default(false).notNull(),
  requiresPayment: boolean("requiresPayment").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
});

export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlanRow = typeof subscriptionPlans.$inferInsert;

export const expenses = pgTable(
  "expenses",
  {
    id: serial("id").primaryKey(),
    description: varchar("description", { length: 512 }).notNull(),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 8 }).default("OMR").notNull(),
    category: expensesCategoryEnum("category").default("other").notNull(),
    incurredAt: timestamp("incurredAt").defaultNow().notNull(),
    notes: text("notes"),
    createdByUserId: bigint("createdByUserId", { mode: "number" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    incurredIdx: index("expenses_incurred_idx").on(table.incurredAt),
  }),
);

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

export const paymentGateways = pgTable(
  "payment_gateways",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull(),
    nameAr: varchar("nameAr", { length: 128 }).notNull(),
    nameEn: varchar("nameEn", { length: 128 }).notNull(),
    isEnabled: boolean("isEnabled").default(false).notNull(),
    isTestMode: boolean("isTestMode").default(true).notNull(),
    configJson: text("configJson").notNull().default("{}"),
    sortOrder: integer("sortOrder").default(0).notNull(),
  },
  (table) => ({
    slugUniq: uniqueIndex("pgw_slug_uniq").on(table.slug),
  }),
);

export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = typeof paymentGateways.$inferInsert;

export const platformSequences = pgTable("platform_sequences", {
  key: varchar("key", { length: 32 }).primaryKey(),
  nextValue: integer("nextValue").notNull().default(1),
});

export const coupons = pgTable(
  "coupons",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 64 }).notNull(),
    description: varchar("description", { length: 512 }),
    discountType: couponsDiscountTypeEnum("discountType")
      .default("percent")
      .notNull(),
    discountValue: integer("discountValue").notNull(),
    appliesTo: couponsAppliesToEnum("appliesTo").default("all").notNull(),
    planSlug: planSlugEnum("planSlug"),
    maxUses: integer("maxUses"),
    usedCount: integer("usedCount").default(0).notNull(),
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

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: serial("id").primaryKey(),
  couponId: bigint("couponId", { mode: "number" }).notNull(),
  userId: bigint("userId", { mode: "number" }).notNull(),
  discountApplied: integer("discountApplied").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: serial("id").primaryKey(),
    adminUserId: bigint("adminUserId", { mode: "number" }).notNull(),
    action: varchar("action", { length: 128 }).notNull(),
    targetType: varchar("targetType", { length: 64 }),
    targetId: varchar("targetId", { length: 128 }),
    details: text("details"),
    ip: varchar("ip", { length: 45 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    adminIdx: index("admin_audit_admin_idx").on(table.adminUserId),
  }),
);

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;

export const platformSettings = pgTable("platform_settings", {
  id: integer("id").primaryKey().default(1),
  companyNameAr: varchar("companyNameAr", { length: 255 }),
  companyNameEn: varchar("companyNameEn", { length: 255 }),
  logoUrl: text("logoUrl"),
  address: text("address"),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  taxNumber: varchar("taxNumber", { length: 64 }),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type PlatformSettings = typeof platformSettings.$inferSelect;
export type InsertPlatformSettings = typeof platformSettings.$inferInsert;
