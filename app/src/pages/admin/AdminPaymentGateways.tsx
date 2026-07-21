import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import GatewayLogo from "@/components/payment/GatewayLogo";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

export default function AdminPaymentGateways() {
  useAdmin();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");

  const gatewaysQuery = trpc.admin.listPaymentGateways.useQuery();

  if (gatewaysQuery.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  const gateways = gatewaysQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">{t("admin.gateways.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin.gateways.pickGateway")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {gateways.map((g) => (
          <Link
            key={g.id}
            to={`/admin/gateways/${g.slug}`}
            className={cn(
              "group relative flex flex-col items-center gap-4 rounded-2xl border-2 bg-card p-6 transition-all",
              "hover:border-primary hover:shadow-lg hover:-translate-y-0.5",
              g.isEnabled ? "border-primary/40" : "border-border opacity-90",
            )}
          >
            <GatewayLogo slug={g.slug} size="lg" />
            <div className="text-center">
              <p className="font-bold text-lg">{isAr ? g.nameAr : g.nameEn}</p>
              <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                {g.isEnabled && (
                  <Badge variant="default" className="text-[10px]">
                    {t("admin.gateways.enabled")}
                  </Badge>
                )}
                {g.isTestMode && (
                  <Badge variant="secondary" className="text-[10px]">
                    {t("admin.gateways.testMode")}
                  </Badge>
                )}
              </div>
            </div>
            <ChevronLeft
              className={cn(
                "absolute top-4 start-4 h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180",
              )}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
