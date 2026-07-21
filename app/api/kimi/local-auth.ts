import type { User } from "@db/schema";

export const LOCAL_DEV_UNION_ID = "local:dev-user";

export function getLocalDevUser(): User {
  const now = new Date();
  return {
    id: 1,
    unionId: LOCAL_DEV_UNION_ID,
    name: "مستخدم التطوير",
    email: "dev@local",
    avatar: null,
    role: "admin",
    createdAt: now,
    updatedAt: now,
    lastSignInAt: now,
  };
}

export function isLocalDevUnionId(unionId: string): boolean {
  return unionId === LOCAL_DEV_UNION_ID;
}
