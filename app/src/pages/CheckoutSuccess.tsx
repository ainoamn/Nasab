import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useBuildBehind } from "@/hooks/useBuildBehind";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { CompanyDocumentHeader } from "@/components/CompanyDocumentHeader";

function formatOmr(amount: number, currencyLabel: string) {
  return `${(amount / 1000).toFixed(3)} ${currencyLabel}`;
}

export default function CheckoutSuccess() {
  const { t } = useTranslation();
  const omr = t("common.currencyOmr");
  const { liveBuild, mainSha, buildBehind, dbConfigured } = useBuildBehind();
  const [params] = useSearchParams();
  const invoiceNumber = params.get("invoice") ?? "";
  const statusParam = params.get("status") ?? "pending";

  useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const invoiceQuery = trpc.payment.getInvoice.useQuery(
    { number: invoiceNumber },
    {
      enabled: Boolean(invoiceNumber),
      refetchInterval: (q) =>
        q.state.data?.status === "pending" && statusParam !== "error" ? 3000 : false,
    },
  );

  useEffect(() => {
    if (invoiceQuery.data?.status === "paid") {
      void utils.user.getProfile.invalidate();
    }
  }, [invoiceQuery.data?.status, utils.user.getProfile]);

  const invoice = invoiceQuery.data;
  const isPaid = invoice?.status === "paid" || statusParam === "paid";
  const isError = statusParam === "error";

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <header className="border-b bg-background/90 backdrop-blur py-4">
        <div className="mx-auto max-w-lg px-4">
          <CompanyDocumentHeader compact align="start" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-4">
        {dbConfigured === false || buildBehind ? (
          <div
            className="w-full max-w-lg rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
            role="status"
          >
            {dbConfigured === false ? (
              <p>{t("checkoutSuccess.dbNotConfigured")}</p>
            ) : null}
            {buildBehind ? (
              <p className={dbConfigured === false ? "mt-1" : undefined}>
                {t("checkoutSuccess.buildBehind", {
                  live: liveBuild,
                  main: mainSha,
                })}
              </p>
            ) : null}
            <Link
              to="/setup"
              className="mt-1 inline-block font-medium underline underline-offset-2"
            >
              {t("checkoutSuccess.openSetup")}
            </Link>
          </div>
        ) : null}
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center pb-2">
            {isError ? (
              <XCircle className="h-14 w-14 text-destructive mx-auto mb-2" />
            ) : isPaid ? (
              <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto mb-2" />
            ) : (
              <Clock className="h-14 w-14 text-amber-500 mx-auto mb-2" />
            )}
            <CardTitle className="font-display text-xl">
              {isError
                ? t("checkoutSuccess.errorTitle")
                : isPaid
                  ? t("checkoutSuccess.paidTitle")
                  : t("checkoutSuccess.pendingTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {!invoiceNumber ? (
              <p className="text-muted-foreground">{t("checkoutSuccess.noInvoice")}</p>
            ) : invoiceQuery.isLoading ? (
              <Skeleton className="h-24 rounded-lg mx-auto max-w-xs" />
            ) : invoice ? (
              <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2 text-start">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("account.billing.cols.number")}</span>
                  <span className="font-mono font-medium">{invoice.number}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("account.billing.cols.amount")}</span>
                  <span>{formatOmr(invoice.amount, omr)}</span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-muted-foreground">{t("account.billing.cols.status")}</span>
                  <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                    {t(`account.billing.status.${invoice.status}`)}
                  </Badge>
                </div>
                {invoice.planSlug && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{t("checkoutSuccess.plan")}</span>
                    <span>{t(`account.plans.${invoice.planSlug}`)}</span>
                  </div>
                )}
              </div>
            ) : null}

            <p className="text-sm text-muted-foreground">
              {isPaid
                ? t("checkoutSuccess.paidDesc")
                : isError
                  ? t("checkoutSuccess.errorDesc")
                  : t("checkoutSuccess.pendingDesc")}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button asChild variant="outline" className="flex-1">
                <Link to="/account">{t("checkout.backAccount")}</Link>
              </Button>
              <Button asChild className="flex-1">
                <Link to="/dashboard">{t("nav.myTrees")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
