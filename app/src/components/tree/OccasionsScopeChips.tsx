import { useTranslation } from "react-i18next";
import type { OccasionsScope } from "@/lib/occasionsScope";
import { cn } from "@/lib/utils";

type Props = {
  value: OccasionsScope;
  onChange: (scope: OccasionsScope) => void;
  /** مفتاح ترجمة للتسمية — افتراضي مناسبات */
  labelKey?: string;
  className?: string;
};

const SCOPES: OccasionsScope[] = ["close", "favorites", "all"];

/** نطاق دائرتي / المفضلة / الكل — مناسبات أو جولة بحث */
export default function OccasionsScopeChips({
  value,
  onChange,
  labelKey = "tree.occasionsScopeLabel",
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      role="group"
      aria-label={t(labelKey)}
    >
      <span className="text-[11px] font-medium text-muted-foreground">
        {t(labelKey)}
      </span>
      {SCOPES.map((scope) => (
        <button
          key={scope}
          type="button"
          onClick={() => onChange(scope)}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-medium transition",
            value === scope
              ? "bg-sky-600 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
          )}
        >
          {t(`tree.occasionsScope.${scope}`)}
        </button>
      ))}
    </div>
  );
}
