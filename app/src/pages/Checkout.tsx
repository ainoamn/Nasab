import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import GatewayLogo from "@/components/payment/GatewayLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { PaymentGatewaySlug, SubscriptionPlan } from "@contracts/constants";
import { ArrowRight, Check, Loader2, TreePalm } from "lucide-react";
import { toast } from "sonner";

function formatOmr(amount: number) {
  return `${(amount / 1000).toFixed(3)} ر.ع.`;
}

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const planParam = (params.get("plan") ?? "plus") as SubscriptionPlan;
  const isAr = i18n.language.startsWith("ar");

  useAuth({ redirectOnUnauthenticated: true });

  const [gatewaySlug, setGatewaySlug] = useState<PaymentGatewaySlug | "">("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [offlineInfo, setOfflineInfo] = useState<{
    invoiceNumber: string;
    instructions: string;
    bankDetails?: Record<string, string>;
  } | null>(null);

  const plansQuery = trpc.payment.listPlans.useQuery();
  const gatewaysQuery = trpc.payment.listGateways.useQuery();

  const plan = useMemo(
    () => plansQuery.data?.find((p) => p.slug === planParam),
    [plansQuery.data, planParam],
  );

  const previewQuery = trpc.payment.previewCheckout.useQuery(
    {
      planSlug: planParam,
      couponCode: appliedCoupon || undefined,
    },
    { enabled: Boolean(plan) && planParam !== "free" },
  );

  const checkoutMut = trpc.payment.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkout.kind === "redirect" && data.checkout.redirectUrl) {
        window.location.href = data.checkout.redirectUrl;
        return;
      }
      if (data.checkout.kind === "free") {
        toast.success(t("checkout.successFree"));
        navigate(`/checkout/success?invoice=${data.invoiceNumber}&status=paid`);
        return;
      }
      if (data.checkout.kind === "offline") {
        setOfflineInfo({
          invoiceNumber: data.invoiceNumber,
          instructions: data.checkout.instructions ?? "",
          bankDetails: data.checkout.bankDetails,
        });
        toast.success(t("checkout.offlineCreated"));
      }
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (params.get("cancelled")) {
      toast.message(t("checkout.cancelled"));
    }
  }, [params, t]);

  useEffect(() => {
    if (gatewaysQuery.data?.length && !gatewaySlug) {
      setGatewaySlug(gatewaysQuery.data[0]!.slug);
    }
  }, [gatewaysQuery.data, gatewaySlug]);

  const selectedGateway = gatewaysQuery.data?.find((g) => g.slug === gatewaySlug);

  const pay = () => {
    if (!gatewaySlug) return;
    checkoutMut.mutate({
      planSlug: planParam,
      gatewaySlug,
      couponCode: appliedCoupon || undefined,
    });
  };

  if (plansQuery.isLoading || gatewaysQuery.isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <Skeleton className="mx-auto max-w-2xl h-96 rounded-2xl" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-6">
          <p className="text-muted-foreground">{t("checkout.planNotFound")}</p>
          <Button asChild className="mt-4">
            <Link to="/account">{t("checkout.backAccount")}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (gatewaysQuery.data?.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center p-6 space-y-3">
          <p className="font-medium">{t("checkout.noGateways")}</p>
          <p className="text-sm text-muted-foreground">{t("checkout.noGatewaysDesc")}</p>
          <Button asChild variant="outline">
            <Link to="/account">{t("checkout.backAccount")}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (offlineInfo) {
    return (
      <div className="min-h-screen bg-muted/30 py-10 px-4">
        <div className="mx-auto max-w-lg space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("checkout.offlineTitle")}</CardTitle>
              <CardDescription>{t("checkout.offlineDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 font-mono text-sm whitespace-pre-wrap">
                {offlineInfo.instructions}
              </div>
              {offlineInfo.bankDetails?.iban && (
                <div className="text-sm text-muted-foreground">
                  IBAN: <span className="font-mono">{offlineInfo.bankDetails.iban}</span>
                </div>
              )}
              <Button asChild className="w-full">
                <Link to={`/checkout/success?invoice=${offlineInfo.invoiceNumber}&status=pending`}>
                  {t("checkout.viewInvoice")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const pricing = previewQuery.data;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-display font-bold text-primary">
            <TreePalm className="h-5 w-5" />
            {t("brand")}
          </Link>
          <LanguageSwitcher variant="outline" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("checkout.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("checkout.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isAr ? plan.nameAr : plan.nameEn}</span>
              <Badge>{t(`account.plans.${plan.slug as SubscriptionPlan}`)}</Badge>
            </CardTitle>
            <CardDescription>
              {plan.periodDays} {t("checkout.days")} ·{" "}
              {plan.renewalDiscountPercent > 0 &&
                t("checkout.renewalDiscount", { pct: plan.renewalDiscountPercent })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewQuery.isLoading ? (
              <Skeleton className="h-20 rounded-lg" />
            ) : pricing ? (
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("checkout.subtotal")}</span>
                  <span>{formatOmr(pricing.originalAmount)}</span>
                </div>
                {pricing.renewalDiscountApplied > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>{t("checkout.renewalSaving")}</span>
                    <span>- {formatOmr(pricing.renewalDiscountApplied)}</span>
                  </div>
                )}
                {pricing.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>{t("checkout.couponSaving")}</span>
                    <span>- {formatOmr(pricing.couponDiscount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>{t("checkout.total")}</span>
                  <span className="text-primary">{formatOmr(pricing.finalAmount)}</span>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>{t("account.coupon.title")}</Label>
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder={t("account.coupon.ph")}
                  dir="ltr"
                  className="font-mono"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setAppliedCoupon(couponCode.trim());
                    previewQuery.refetch();
                  }}
                  disabled={!couponCode.trim()}
                >
                  {t("checkout.applyCoupon")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-semibold mb-3">{t("checkout.pickGateway")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {gatewaysQuery.data?.map((g) => (
              <button
                key={g.slug}
                type="button"
                onClick={() => setGatewaySlug(g.slug)}
                className={cn(
                  "flex items-center gap-4 rounded-2xl border-2 p-4 text-start transition-all",
                  gatewaySlug === g.slug
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/40",
                )}
              >
                <GatewayLogo slug={g.slug} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{isAr ? g.nameAr : g.nameEn}</p>
                  <div className="flex gap-1 mt-1">
                    {g.isTestMode && (
                      <Badge variant="secondary" className="text-[10px]">
                        {t("admin.gateways.testMode")}
                      </Badge>
                    )}
                    {g.isOffline && (
                      <Badge variant="outline" className="text-[10px]">
                        {t("checkout.offlineBadge")}
                      </Badge>
                    )}
                  </div>
                </div>
                {gatewaySlug === g.slug && (
                  <Check className="h-5 w-5 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" asChild className="sm:flex-1">
            <Link to="/account">{t("checkout.backAccount")}</Link>
          </Button>
          <Button
            className="sm:flex-[2] gap-2"
            size="lg"
            disabled={!gatewaySlug || checkoutMut.isPending || previewQuery.isLoading}
            onClick={pay}
          >
            {checkoutMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            )}
            {selectedGateway?.isOffline
              ? t("checkout.confirmOffline")
              : t("checkout.payNow")}
          </Button>
        </div>
      </main>
    </div>
  );
}
