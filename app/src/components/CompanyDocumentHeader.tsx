import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  className?: string;
  compact?: boolean;
  /** عرض تفاصيل الاتصال تحت الاسم */
  showContact?: boolean;
  /** محاذاة للمستندات المطبوعة */
  align?: "center" | "start";
};

export function CompanyDocumentHeader({
  className,
  compact,
  showContact = false,
  align = "center",
}: Props) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = trpc.platform.getBranding.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className={cn("mb-6", className)}>
        <Skeleton className={cn("mx-auto", compact ? "h-12 w-32" : "h-16 w-40")} />
      </div>
    );
  }

  const name =
    i18n.language === "ar"
      ? data?.companyNameAr?.trim() || t("brand")
      : data?.companyNameEn?.trim() || t("brand");

  const contactLines = [
    data?.address?.trim(),
    data?.phone?.trim(),
    data?.email?.trim(),
    data?.taxNumber?.trim()
      ? `${t("admin.company.taxNumber")}: ${data.taxNumber.trim()}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <header
      className={cn(
        "mb-6 pb-4 border-b print:break-inside-avoid",
        align === "center" ? "text-center" : "text-start",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-3",
          align === "center" ? "items-center" : "items-start",
        )}
      >
        {data?.logoUrl ? (
          <img
            src={data.logoUrl}
            alt={name}
            className={cn(
              "object-contain",
              compact ? "max-h-12 max-w-[140px]" : "max-h-20 max-w-[220px]",
            )}
          />
        ) : null}
        <div>
          <h2
            className={cn(
              "font-display font-bold text-primary",
              compact ? "text-lg" : "text-xl sm:text-2xl",
            )}
          >
            {name}
          </h2>
          {showContact && contactLines.length > 0 && (
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {contactLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function useCompanyDisplayName(): string {
  const { t, i18n } = useTranslation();
  const { data } = trpc.platform.getBranding.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });
  return i18n.language === "ar"
    ? data?.companyNameAr?.trim() || t("brand")
    : data?.companyNameEn?.trim() || t("brand");
}
