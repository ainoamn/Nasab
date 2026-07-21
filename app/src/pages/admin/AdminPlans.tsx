import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import type { SubscriptionPlan } from "@contracts/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Crown, Save } from "lucide-react";
import { toast } from "sonner";

type PlanForm = {
  nameAr: string;
  nameEn: string;
  maxTrees: string;
  maxPersonsPerTree: string;
  maxPersonsTotal: string;
  priceYearly: string;
  periodDays: string;
  renewalDiscountPercent: string;
  includesPrint: boolean;
  requiresPayment: boolean;
  isActive: boolean;
};

function limitInput(v: number | null) {
  return v == null ? "" : String(v);
}

function parseLimit(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function AdminPlans() {
  useAdmin();
  const utils = trpc.useUtils();
  const { t } = useTranslation();

  const plansQuery = trpc.admin.listPlans.useQuery();
  const [forms, setForms] = useState<Record<string, PlanForm>>({});

  useEffect(() => {
    if (!plansQuery.data) return;
    const next: Record<string, PlanForm> = {};
    for (const p of plansQuery.data) {
      next[p.slug] = {
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        maxTrees: limitInput(p.maxTrees),
        maxPersonsPerTree: limitInput(p.maxPersonsPerTree),
        maxPersonsTotal: limitInput(p.maxPersonsTotal),
        priceYearly: String((p.priceYearly ?? 0) / 1000),
        periodDays: String(p.periodDays ?? 365),
        renewalDiscountPercent: String(p.renewalDiscountPercent ?? 0),
        includesPrint: p.includesPrint,
        requiresPayment: p.requiresPayment,
        isActive: p.isActive,
      };
    }
    setForms(next);
  }, [plansQuery.data]);

  const updateMut = trpc.admin.updatePlan.useMutation({
    onSuccess: async () => {
      toast.success(t("admin.plans.saved"));
      await utils.admin.listPlans.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const savePlan = (slug: SubscriptionPlan) => {
    const f = forms[slug];
    if (!f) return;
    updateMut.mutate({
      slug,
      nameAr: f.nameAr.trim(),
      nameEn: f.nameEn.trim(),
      maxTrees: parseLimit(f.maxTrees),
      maxPersonsPerTree: parseLimit(f.maxPersonsPerTree),
      maxPersonsTotal: parseLimit(f.maxPersonsTotal),
      priceYearly: Math.round(parseFloat(f.priceYearly || "0") * 1000),
      periodDays: parseInt(f.periodDays || "365", 10) || 365,
      renewalDiscountPercent: parseInt(f.renewalDiscountPercent || "0", 10) || 0,
      includesPrint: f.includesPrint,
      requiresPayment: f.requiresPayment,
      isActive: f.isActive,
    });
  };

  const setField = (slug: string, key: keyof PlanForm, value: string | boolean) => {
    setForms((prev) => ({
      ...prev,
      [slug]: { ...prev[slug], [key]: value },
    }));
  };

  if (plansQuery.isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">{t("admin.plans.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin.plans.subtitle")}</p>
      </div>

      <div className="grid gap-4">
        {(plansQuery.data ?? []).map((plan) => {
          const f = forms[plan.slug];
          if (!f) return null;
          return (
            <Card key={plan.slug}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Crown className="h-5 w-5 text-primary" />
                  {t(`account.plans.${plan.slug as SubscriptionPlan}`)}
                  <Badge variant="outline" className="font-mono text-xs">
                    {plan.slug}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("admin.plans.nameAr")}</Label>
                    <Input
                      value={f.nameAr}
                      onChange={(e) => setField(plan.slug, "nameAr", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.plans.nameEn")}</Label>
                    <Input
                      value={f.nameEn}
                      onChange={(e) => setField(plan.slug, "nameEn", e.target.value)}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.plans.maxTrees")}</Label>
                    <Input
                      value={f.maxTrees}
                      onChange={(e) => setField(plan.slug, "maxTrees", e.target.value)}
                      placeholder={t("admin.plans.unlimitedPh")}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.plans.maxPersonsPerTree")}</Label>
                    <Input
                      value={f.maxPersonsPerTree}
                      onChange={(e) =>
                        setField(plan.slug, "maxPersonsPerTree", e.target.value)
                      }
                      placeholder={t("admin.plans.unlimitedPh")}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.plans.maxPersonsTotal")}</Label>
                    <Input
                      value={f.maxPersonsTotal}
                      onChange={(e) =>
                        setField(plan.slug, "maxPersonsTotal", e.target.value)
                      }
                      placeholder={t("admin.plans.unlimitedPh")}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.plans.priceYearly")}</Label>
                    <Input
                      value={f.priceYearly}
                      onChange={(e) => setField(plan.slug, "priceYearly", e.target.value)}
                      dir="ltr"
                      type="number"
                      step="0.001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.plans.periodDays")}</Label>
                    <Input
                      value={f.periodDays}
                      onChange={(e) => setField(plan.slug, "periodDays", e.target.value)}
                      dir="ltr"
                      type="number"
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.plans.renewalDiscountPercent")}</Label>
                    <Input
                      value={f.renewalDiscountPercent}
                      onChange={(e) =>
                        setField(plan.slug, "renewalDiscountPercent", e.target.value)
                      }
                      dir="ltr"
                      type="number"
                      min={0}
                      max={100}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={f.includesPrint}
                      onCheckedChange={(v) => setField(plan.slug, "includesPrint", v)}
                    />
                    {t("admin.plans.includesPrint")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={f.requiresPayment}
                      onCheckedChange={(v) => setField(plan.slug, "requiresPayment", v)}
                    />
                    {t("admin.plans.requiresPayment")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={f.isActive}
                      onCheckedChange={(v) => setField(plan.slug, "isActive", v)}
                    />
                    {t("admin.plans.isActive")}
                  </label>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="gap-2"
                    onClick={() => savePlan(plan.slug as SubscriptionPlan)}
                    disabled={updateMut.isPending}
                  >
                    <Save className="h-4 w-4" />
                    {t("common.save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
