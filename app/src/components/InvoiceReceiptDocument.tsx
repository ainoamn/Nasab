import { useTranslation } from "react-i18next";
import { CompanyDocumentHeader } from "@/components/CompanyDocumentHeader";
import { localeTag } from "@/i18n";
import { Badge } from "@/components/ui/badge";

type InvoiceLike = {
  number: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  issuedAt?: Date | string | null;
  createdAt?: Date | string | null;
  paidAt?: Date | string | null;
  planSlug?: string | null;
  userName?: string | null;
  userEmail?: string | null;
};

function formatAmount(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
  }).format(amount / 1000);
}

function formatDate(d: Date | string | null | undefined, locale: string, empty = "—") {
  if (!d) return empty;
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

export function InvoiceReceiptDocument({ invoice }: { invoice: InvoiceLike }) {
  const { t, i18n } = useTranslation();
  const locale = localeTag(i18n.language);
  const empty = t("common.emDash");
  const issued = formatDate(invoice.issuedAt ?? invoice.createdAt, locale, empty);
  const paid = formatDate(invoice.paidAt, locale, empty);

  return (
    <div className="max-w-lg mx-auto">
      <CompanyDocumentHeader showContact align="center" />
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("admin.company.receiptTitle")}
        </p>
        <p className="font-mono text-lg font-bold mt-1">{invoice.number}</p>
      </div>
      <dl className="space-y-3 text-sm border rounded-lg p-4">
        {invoice.userName && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("admin.invoices.customer")}</dt>
            <dd className="font-medium text-end">{invoice.userName}</dd>
          </div>
        )}
        {invoice.userEmail && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("account.profile.billingEmail")}</dt>
            <dd className="text-end" dir="ltr">
              {invoice.userEmail}
            </dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("account.billing.cols.description")}</dt>
          <dd className="text-end">{invoice.description ?? "—"}</dd>
        </div>
        {invoice.planSlug && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("checkoutSuccess.plan")}</dt>
            <dd className="text-end">{t(`account.plans.${invoice.planSlug}`)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("account.billing.cols.amount")}</dt>
          <dd className="font-bold">{formatAmount(invoice.amount, invoice.currency, locale)}</dd>
        </div>
        <div className="flex justify-between gap-4 items-center">
          <dt className="text-muted-foreground">{t("account.billing.cols.status")}</dt>
          <dd>
            <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
              {t(`account.billing.status.${invoice.status}`)}
            </Badge>
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("admin.company.issuedAt")}</dt>
          <dd>{issued}</dd>
        </div>
        {invoice.paidAt && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("admin.company.paidAt")}</dt>
            <dd>{paid}</dd>
          </div>
        )}
      </dl>
      <p className="mt-6 text-center text-[10px] text-muted-foreground">{t("admin.company.receiptFooter")}</p>
    </div>
  );
}
