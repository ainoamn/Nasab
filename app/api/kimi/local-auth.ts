import type { User } from "@db/tables";

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
    phone: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    addressRegion: null,
    country: "OM",
    plan: "print",
    planStartedAt: null,
    planExpiresAt: null,
    userNumber: null,
    referralCode: null,
    referredByUserId: null,
    billingEmail: null,
    username: "admin",
    lastSignInIp: null,
    registrationIp: null,
    isBanned: false,
    banReason: null,
    bannedAt: null,
    sessionVersion: 0,
    createdAt: now,
    updatedAt: now,
    lastSignInAt: now,
  };
}

export function isLocalDevUnionId(unionId: string): boolean {
  return unionId === LOCAL_DEV_UNION_ID;
}
