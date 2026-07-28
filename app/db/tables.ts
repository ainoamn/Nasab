import {
  getDatabaseDialect,
  isSqliteDatabase,
} from "./dialect";
import * as mysql from "./schema";
import * as sqlite from "./schema.sqlite";
import * as postgres from "./schema.pg";

/**
 * Runtime picks SQLite, MySQL, or Postgres. Types use the SQLite schema as the
 * canonical shape (columns are kept in sync) to avoid dialect union explosions.
 */
type CanonicalSchema = typeof sqlite;
const dialect = getDatabaseDialect();
const active = (
  dialect === "sqlite"
    ? sqlite
    : dialect === "postgres"
      ? postgres
      : mysql
) as unknown as CanonicalSchema;

export const users = active.users;
export const trees = active.trees;
export const persons = active.persons;
export const relationships = active.relationships;
export const treeMembers = active.treeMembers;
export const invites = active.invites;
export const changeLogs = active.changeLogs;
export const treeBranches = active.treeBranches;
export const personLinks = active.personLinks;
export const invoices = active.invoices;
export const subscriptionPlans = active.subscriptionPlans;
export const expenses = active.expenses;
export const paymentGateways = active.paymentGateways;
export const platformSequences = active.platformSequences;
export const coupons = active.coupons;
export const couponRedemptions = active.couponRedemptions;
export const adminAuditLogs = active.adminAuditLogs;
export const platformSettings = active.platformSettings;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Tree = typeof trees.$inferSelect;
export type InsertTree = typeof trees.$inferInsert;
export type Person = typeof persons.$inferSelect;
export type InsertPerson = typeof persons.$inferInsert;
export type Relationship = typeof relationships.$inferSelect;
export type InsertRelationship = typeof relationships.$inferInsert;
export type TreeMember = typeof treeMembers.$inferSelect;
export type InsertTreeMember = typeof treeMembers.$inferInsert;
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;
export type ChangeLog = typeof changeLogs.$inferSelect;
export type InsertChangeLog = typeof changeLogs.$inferInsert;
export type TreeBranch = typeof treeBranches.$inferSelect;
export type InsertTreeBranch = typeof treeBranches.$inferInsert;
export type PersonLink = typeof personLinks.$inferSelect;
export type InsertPersonLink = typeof personLinks.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlanRow = typeof subscriptionPlans.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
export type PaymentGateway = typeof paymentGateways.$inferSelect;
export type InsertPaymentGateway = typeof paymentGateways.$inferInsert;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;
export type PlatformSettings = typeof platformSettings.$inferSelect;

export { isSqliteDatabase, getDatabaseDialect };
