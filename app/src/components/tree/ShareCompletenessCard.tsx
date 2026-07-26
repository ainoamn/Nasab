import { useTranslation } from "react-i18next";
import type { CompletenessBreakdown } from "@/lib/treeCompleteness";
import { cn } from "@/lib/utils";
import { Gauge } from "lucide-react";

type Props = {
  completeness: CompletenessBreakdown;
  className?: string;
};

/** بطاقة اكتمال الشجرة للعرض العام — شفافية تحفّز المشاركة */
export default function ShareCompletenessCard({
  completeness,
  className,
}: Props) {
  const { t } = useTranslation();
  const c = completeness;
  if (c.peopleCount === 0) return null;

  const rows = [
    {
      key: "birth",
      label: t("tree.completenessBirth", {
        n: c.withBirthYear,
        total: c.peopleCount,
      }),
      pct: Math.round((100 * c.withBirthYear) / c.peopleCount),
    },
    {
      key: "photo",
      label: t("tree.completenessPhoto", {
        n: c.withPhoto,
        total: c.peopleCount,
      }),
      pct: Math.round((100 * c.withPhoto) / c.peopleCount),
    },
    {
      key: "parent",
      label: t("tree.completenessParent", {
        n: c.withParent,
        total: c.peopleCount,
      }),
      pct: Math.round((100 * c.withParent) / c.peopleCount),
    },
  ];

  return (
    <div
      className={cn(
        "mb-4 rounded-2xl border border-sky-200/80 bg-gradient-to-l from-sky-50/90 to-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
          <Gauge className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sky-950">
            {t("tree.completenessTitle")}
          </p>
          <p className="text-xs text-sky-900/70">
            {t("share.completenessHint")}
          </p>
        </div>
        <span className="rounded-full bg-sky-600 px-3 py-1 text-sm font-bold tabular-nums text-white">
          {c.score}%
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-sky-100">
        <div
          className="h-full rounded-full bg-sky-600 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, c.score))}%` }}
        />
      </div>
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center gap-2 text-[11px] text-sky-950"
          >
            <span className="min-w-0 flex-1 truncate">{row.label}</span>
            <span className="tabular-nums text-sky-800/70">{row.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
