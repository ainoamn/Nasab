import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./queries/connection";
import { changeLogs, treeMembers, trees, type Person } from "@db/tables";
import type { PersonPrivacy, TreeRole, TreeStatus } from "@contracts/constants";
import { generateShareToken } from "./lib/share-token";

const ROLE_RANK: Record<TreeRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

/** إرجاع دور المستخدم في الشجرة أو null إن لم يكن عضواً */
export async function getMemberRole(
  userId: number,
  treeId: number,
): Promise<TreeRole | null> {
  const db = getDb();
  const member = await db.query.treeMembers.findFirst({
    where: and(eq(treeMembers.treeId, treeId), eq(treeMembers.userId, userId)),
  });
  return (member?.role as TreeRole | undefined) ?? null;
}

export function roleAtLeast(role: TreeRole, min: TreeRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** التحقق من أن المستخدم عضو بدور أدناه min وإلا رمي خطأ */
export async function requireTreeRole(
  userId: number,
  treeId: number,
  min: TreeRole,
): Promise<TreeRole> {
  const role = await getMemberRole(userId, treeId);
  if (!role || !roleAtLeast(role, min)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "ليس لديك صلاحية للقيام بهذا الإجراء على هذه الشجرة",
    });
  }

  const db = getDb();
  const tree = await db.query.trees.findFirst({
    where: eq(trees.id, treeId),
  });
  if (!tree) {
    throw new TRPCError({ code: "NOT_FOUND", message: "الشجرة غير موجودة" });
  }

  const status = (tree.status ?? "active") as TreeStatus;

  if (status === "archived") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "هذه الشجرة مؤرشفة — يمكن للمالك استعادتها من لوحة التحكم",
    });
  }

  if (
    status === "paused" &&
    min !== "viewer"
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "الشجرة موقوفة مؤقتاً — العرض فقط حتى يعاد تفعيلها من لوحة التحكم",
    });
  }

  return role;
}

/** جلب الشجرة عبر رمز المشاركة الآمن */
export async function getViewableTreeByShareToken(shareToken: string, userId?: number) {
  const db = getDb();
  const tree = await db.query.trees.findFirst({
    where: eq(trees.shareToken, shareToken),
  });
  if (!tree) {
    throw new TRPCError({ code: "NOT_FOUND", message: "الشجرة غير موجودة" });
  }

  const role = userId ? await getMemberRole(userId, tree.id) : null;

  if (tree.visibility === "private" && !role) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "هذه الشجرة خاصة",
    });
  }

  const status = (tree.status ?? "active") as TreeStatus;
  if (status === "archived") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "هذه الشجرة مؤرشفة",
    });
  }

  return { tree: { ...tree, status }, role };
}

export async function ensureTreeShareToken(treeId: number): Promise<string> {
  const db = getDb();
  const tree = await db.query.trees.findFirst({ where: eq(trees.id, treeId) });
  if (!tree) throw new TRPCError({ code: "NOT_FOUND" });
  if (tree.shareToken) return tree.shareToken;
  const token = generateShareToken();
  await db.update(trees).set({ shareToken: token }).where(eq(trees.id, treeId));
  return token;
}

/** فلترة الأشخاص حسب الخصوصية لأعضاء الشجرة */
export function filterPersonsForMember(
  people: Person[],
  role: TreeRole,
  userId: number,
): Person[] {
  if (roleAtLeast(role, "admin")) return people;

  return people.filter((p) => {
    const privacy = p.privacy as PersonPrivacy;
    if (privacy === "public" || privacy === "family" || privacy === "linked") {
      return true;
    }
    if (privacy === "private") {
      return p.createdById === userId;
    }
    return false;
  });
}

/** @deprecated استخدم getViewableTreeByShareToken للمشاركة العامة */
export async function getViewableTree(treeId: number, userId?: number) {
  const db = getDb();
  const tree = await db.query.trees.findFirst({
    where: eq(trees.id, treeId),
  });
  if (!tree) {
    throw new TRPCError({ code: "NOT_FOUND", message: "الشجرة غير موجودة" });
  }
  const role = userId ? await getMemberRole(userId, treeId) : null;
  const isPublic = tree.visibility !== "private";
  if (!role && !isPublic) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "هذه الشجرة خاصة ولا يمكنك عرضها",
    });
  }

  const status = (tree.status ?? "active") as TreeStatus;
  if (status === "archived") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "هذه الشجرة مؤرشفة",
    });
  }

  return { tree: { ...tree, status }, role };
}

/**
 * تطبيق قواعد الخصوصية على قائمة الأشخاص للزائر غير العضو:
 * - لا يظهر إلا من خصوصيته "عام"
 * - إخفاء الأحياء حسب إعداد الشجرة
 * - عرض الإناث حسب إعداد الشجرة (كامل / اسم أول / إخفاء)
 */
export function applyPublicPrivacy(
  list: Person[],
  tree: { hideLiving: boolean; femaleDisplay: string },
): Person[] {
  return list
    .filter((p) => p.privacy === "public")
    .filter((p) => !(tree.hideLiving && p.isLiving))
    .filter((p) => !(tree.femaleDisplay === "hidden" && p.gender === "female"))
    .map((p) => {
      if (tree.femaleDisplay === "firstOnly" && p.gender === "female") {
        return {
          ...p,
          fatherName: null,
          kunya: null,
          laqab: null,
          clan: null,
          notes: null,
          photoUrl: null,
          birthYear: null,
          deathYear: null,
        };
      }
      return p;
    });
}

/** تسجيل حدث في سجل التدقيق */
export async function logChange(entry: {
  treeId: number;
  userId: number;
  action: string;
  personId?: number;
  details?: string;
}) {
  const db = getDb();
  await db.insert(changeLogs).values({
    treeId: entry.treeId,
    userId: entry.userId,
    action: entry.action,
    personId: entry.personId ?? null,
    details: entry.details ?? null,
  });
}
