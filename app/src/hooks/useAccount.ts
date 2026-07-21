import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import type { SubscriptionPlan } from "@contracts/constants";

/** بيانات الملف الشخصي — سريعة */
export function useAccountProfile() {
  const { isAuthenticated } = useAuth();
  return trpc.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

/** إحصاءات الاستخدام — تُحمّل بشكل منفصل */
export function useAccountUsage() {
  const { isAuthenticated } = useAuth();
  return trpc.user.getUsage.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 120_000,
  });
}

/** الفواتير — تُحمّل عند فتح تبويب الدفع فقط */
export function useAccountInvoices(enabled: boolean) {
  const { isAuthenticated } = useAuth();
  return trpc.user.listInvoices.useQuery(undefined, {
    enabled: isAuthenticated && enabled,
    staleTime: 60_000,
  });
}

export type AccountProfile = NonNullable<
  ReturnType<typeof useAccountProfile>["data"]
>;

export type AccountUsage = NonNullable<
  ReturnType<typeof useAccountUsage>["data"]
>;

export type AccountPlan = SubscriptionPlan;
