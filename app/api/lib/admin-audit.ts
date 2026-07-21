import { getDb } from "../queries/connection";
import { adminAuditLogs } from "@db/tables";

export async function logAdminAction(entry: {
  adminUserId: number;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  ip?: string | null;
}) {
  const db = getDb();
  await db.insert(adminAuditLogs).values({
    adminUserId: entry.adminUserId,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    details: entry.details ?? null,
    ip: entry.ip ?? null,
  });
}
