import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import GatewayLogo from "@/components/payment/GatewayLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Save } from "lucide-react";
import { toast } from "sonner";

export default function AdminGatewaySettings() {
  useAdmin();
  const { slug } = useParams<{ slug: string }>();
  const utils = trpc.useUtils();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language.startsWith("ar");

  const gatewayQuery = trpc.admin.getPaymentGateway.useQuery(
    { slug: slug! },
    { enabled: !!slug },
  );

  const [isEnabled, setIsEnabled] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true);
  const [config, setConfig] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!gatewayQuery.data) return;
    const g = gatewayQuery.data;
    setIsEnabled(g.isEnabled);
    setIsTestMode(g.isTestMode);
    setConfig(g.config);
  }, [gatewayQuery.data]);

  const updateMut = trpc.admin.updatePaymentGateway.useMutation({
    onSuccess: async () => {
      toast.success(t("admin.gateways.saved"));
      await utils.admin.listPaymentGateways.invalidate();
      await utils.admin.getPaymentGateway.invalidate({ slug: slug! });
    },
    onError: (e) => toast.error(e.message),
  });

  if (gatewayQuery.isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  const g = gatewayQuery.data;
  if (!g) {
    return (
      <p className="text-muted-foreground">{t("admin.gateways.notFound")}</p>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        to="/admin/gateways"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        {t("admin.gateways.back")}
      </Link>

      <div className="flex items-center gap-4">
        <GatewayLogo slug={g.slug} size="lg" />
        <div>
          <h2 className="font-display text-2xl font-bold">
            {isAr ? g.nameAr : g.nameEn}
          </h2>
          <p className="text-sm text-muted-foreground font-mono">{g.slug}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.gateways.settingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-8">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              {t("admin.gateways.enable")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={isTestMode} onCheckedChange={setIsTestMode} />
              {t("admin.gateways.testMode")}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="space-y-1.5 sm:col-span-2">
                <Label className="font-mono text-xs">{key}</Label>
                <Input
                  value={value}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, [key]: e.target.value }))
                  }
                  dir="ltr"
                  type={key.toLowerCase().includes("secret") ? "password" : "text"}
                />
              </div>
            ))}
          </div>

          {g.slug !== "bank_transfer" && g.slug !== "manual" && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs font-mono break-all">
              Webhook: {window.location.origin}/api/webhooks/{g.slug}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              className="gap-2"
              disabled={updateMut.isPending}
              onClick={() =>
                updateMut.mutate({
                  id: g.id,
                  isEnabled,
                  isTestMode,
                  config,
                })
              }
            >
              <Save className="h-4 w-4" />
              {t("common.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
