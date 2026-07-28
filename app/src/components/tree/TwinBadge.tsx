import { useTranslation } from "react-i18next";
import { Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  /** توأم متطابق / غير متطابق */
  kind?: "identical" | "fraternal" | "mixed" | null;
  /** ترتيب داخل المجموعة: 1، 2، 3… */
  order?: number | null;
  /** حجم المجموعة */
  total?: number | null;
  compact?: boolean;
};

/** شارة تمييز التوأم — واضحة في الشاشة والطباعة */
export default function TwinBadge({
  className,
  kind,
  order,
  total,
  compact,
}: Props) {
  const { t } = useTranslation();
  const baseLabel =
    kind === "fraternal"
      ? t("twins.fraternal")
      : kind === "identical"
        ? t("twins.identical")
        : kind === "mixed"
          ? t("twins.mixed")
          : t("twins.badge");
  const mark =
    order != null && total != null && total >= 2
      ? t("twins.markOrder", { order, total })
      : order != null
        ? t("twins.mark", { order })
        : null;
  const title = mark
    ? `${baseLabel} ${t("common.emDash")} ${mark}`
    : baseLabel;

  return (
    <span
      className={cn(
        "twin-badge inline-flex items-center gap-0.5 rounded-full font-bold leading-none shadow-sm",
        "bg-violet-600 text-white ring-2 ring-violet-200 print:bg-violet-700 print:text-white",
        compact ? "px-1 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[10px]",
        className,
      )}
      title={title}
      aria-label={title}
    >
      <Users2
        className={cn(compact ? "h-2.5 w-2.5" : "h-3 w-3")}
        aria-hidden
      />
      <span>{mark ?? t("twins.badge")}</span>
    </span>
  );
}
