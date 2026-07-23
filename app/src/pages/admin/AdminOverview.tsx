import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { localeTag } from "@/i18n";
import {
  Users,
  TreePalm,
  UserCircle,
  Receipt,
  Crown,
  Banknote,
  TrendingUp,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

function formatMoney(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 3,
  }).format(amount / 1000);
}

export default function AdminOverview() {
  useAdmin();
  const { t, i18n } = useTranslation();
  const locale = localeTag(i18n.language);

  const statsQuery = trpc.admin.getStats.useQuery();
  const checklistQuery = trpc.admin.getLaunchChecklist.useQuery();

  if (statsQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const s = statsQuery.data;
  if (!s) return null;

  const statCards = [
    {
      title: t("admin.stats.users"),
      value: s.totalUsers,
      sub: t("admin.stats.adminsCount", { count: s.totalAdmins }),
      icon: Users,
    },
    {
      title: t("admin.stats.trees"),
      value: s.totalTrees,
      icon: TreePalm,
    },
    {
      title: t("admin.stats.persons"),
      value: s.totalPersons,
      icon: UserCircle,
    },
    {
      title: t("admin.stats.invoices"),
      value: s.invoices.total,
      sub: t("admin.stats.pendingCount", { count: s.invoices.pending }),
      icon: Receipt,
    },
    {
      title: t("admin.stats.revenue"),
      value: formatMoney(s.invoices.revenue, locale),
      sub: t("admin.stats.paidCount", { count: s.invoices.paid }),
      icon: TrendingUp,
      isText: true,
    },
    {
      title: t("admin.accounting.profit"),
      value: formatMoney(s.accounting?.profit ?? 0, locale),
      sub: t("admin.stats.bannedCount", { count: s.bannedUsers ?? 0 }),
      icon: Banknote,
      isText: true,
    },
  ];

  const checklist = checklistQuery.data?.items ?? [];

  return (
    <div className="space-y-6">
      {checklist.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.stats.launchTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item) => {
              const label = t(`admin.stats.launchItems.${item.id}`);
              const row = (
                <div className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
                  {item.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <CircleAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    {item.detail && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.detail}
                      </p>
                    )}
                  </div>
                  <Badge variant={item.ok ? "secondary" : "outline"}>
                    {item.ok
                      ? t("admin.stats.launchOk")
                      : t("admin.stats.launchTodo")}
                  </Badge>
                </div>
              );
              return item.href && !item.ok ? (
                <Link
                  key={item.id}
                  to={item.href}
                  className="block hover:opacity-90"
                >
                  {row}
                </Link>
              ) : (
                <div key={item.id}>{row}</div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(({ title, value, sub, icon: Icon, isText }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className={`font-bold ${isText ? "text-xl" : "text-3xl"}`}>
                {value}
              </p>
              {sub && (
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            {t("admin.stats.plansTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(["free", "plus", "print"] as const).map((plan) => (
              <div
                key={plan}
                className="flex items-center gap-2 rounded-lg border px-4 py-3 min-w-[140px]"
              >
                <Badge variant={plan === "plus" ? "default" : "secondary"}>
                  {t(`account.plans.${plan}`)}
                </Badge>
                <span className="font-bold text-lg">{s.plans[plan]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
