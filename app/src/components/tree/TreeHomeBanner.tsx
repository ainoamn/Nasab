import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Image as ImageIcon, Users, Heart, ScrollText, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompletenessBreakdown } from "@/lib/treeCompleteness";

type Props = {
  treeName: string;
  tribe?: string | null;
  region?: string | null;
  description?: string | null;
  peopleCount: number;
  photoCount: number;
  spouseLinkCount: number;
  livingCount: number;
  ownerName?: string | null;
  /** 0–100 اكتمال البيانات */
  completenessScore?: number | null;
  completeness?: CompletenessBreakdown | null;
  completenessOpen?: boolean;
  onCompletenessClick?: () => void;
  className?: string;
};

/**
 * رأس صفحة الشجرة بأسلوب مواقع النسب: غلاف + إحصائيات + نبذة.
 */
export default function TreeHomeBanner({
  treeName,
  tribe,
  region,
  description,
  peopleCount,
  photoCount,
  spouseLinkCount,
  livingCount,
  ownerName,
  completenessScore = null,
  completeness = null,
  completenessOpen = false,
  onCompletenessClick,
  className,
}: Props) {
  const { t } = useTranslation();
  const subtitle = [tribe, region].filter(Boolean).join(" — ");
  const score =
    completenessScore != null
      ? Math.max(0, Math.min(100, Math.round(completenessScore)))
      : null;

  return (
    <div className={cn("mb-5 overflow-hidden rounded-2xl border bg-card shadow-sm", className)}>
      {/* غلاف بصري */}
      <div
        className="relative h-36 sm:h-44 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0f5132 0%, #1a6b45 38%, #3d8b6e 70%, #c4a574 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.35) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)",
          }}
        />
        <div className="absolute inset-0 flex items-end justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0 text-white">
            <p className="text-[11px] sm:text-xs font-medium text-white/80 mb-0.5">
              {t("tree.siteLabel")}
            </p>
            <h2 className="font-display text-xl sm:text-3xl font-bold drop-shadow-sm truncate">
              {treeName}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs sm:text-sm text-white/85 truncate">{subtitle}</p>
            )}
          </div>
          <span
            className="hidden sm:flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/25 text-white/90 backdrop-blur-sm"
            title={t("tree.coverHint")}
          >
            <Camera className="h-4 w-4" />
          </span>
        </div>
      </div>

      {/* شبكة: منشئ + إحصائيات + نبذة */}
      <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,220px)_1fr] lg:grid-cols-[minmax(0,240px)_1fr_1.1fr]">
        <div className="flex items-center gap-3 rounded-xl border bg-muted/40 px-3 py-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-lg">
            {(ownerName ?? treeName).slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {ownerName ?? t("tree.siteOwnerFallback")}
            </p>
            <p className="text-[11px] text-muted-foreground">{t("tree.siteCreator")}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:col-span-1 lg:col-span-1">
          <Stat
            icon={<Users className="h-3.5 w-3.5" />}
            label={t("tree.statPeople")}
            value={peopleCount}
          />
          <Stat
            icon={<ImageIcon className="h-3.5 w-3.5" />}
            label={t("tree.statPhotos")}
            value={photoCount}
          />
          <Stat
            icon={<Heart className="h-3.5 w-3.5" />}
            label={t("tree.statMarriages")}
            value={spouseLinkCount}
          />
          <Stat
            icon={<ScrollText className="h-3.5 w-3.5" />}
            label={t("tree.statLiving")}
            value={livingCount}
          />
        </div>

        <div className="rounded-xl border bg-muted/30 px-3 py-3 sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold text-muted-foreground mb-1">
            {t("tree.aboutTitle", { name: treeName })}
          </p>
          <p className="text-sm leading-relaxed text-foreground/90 line-clamp-3">
            {description?.trim() || t("tree.aboutFallback")}
          </p>
          {score != null && (
            <div className="mt-3 space-y-1.5">
              <button
                type="button"
                className={cn(
                  "w-full space-y-1.5 rounded-lg text-start transition",
                  onCompletenessClick && "hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
                )}
                onClick={onCompletenessClick}
                disabled={!onCompletenessClick}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                    <Gauge className="h-3.5 w-3.5 text-emerald-700" />
                    {t("tree.completenessTitle")}
                  </span>
                  <span className="tabular-nums font-bold text-emerald-800">
                    {score}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-200/80">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      score >= 70
                        ? "bg-emerald-500"
                        : score >= 40
                          ? "bg-amber-500"
                          : "bg-rose-400",
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {onCompletenessClick
                    ? t("tree.completenessClickHint")
                    : t("tree.completenessHint")}
                </p>
              </button>
              {completenessOpen && completeness && (
                <ul className="mt-2 space-y-1 rounded-lg border bg-background/80 px-2.5 py-2 text-[11px] text-foreground/80">
                  <li>
                    {t("tree.completenessBirth", {
                      n: completeness.withBirthYear,
                      total: completeness.peopleCount,
                    })}
                  </li>
                  <li>
                    {t("tree.completenessPhoto", {
                      n: completeness.withPhoto,
                      total: completeness.peopleCount,
                    })}
                  </li>
                  <li>
                    {t("tree.completenessParent", {
                      n: completeness.withParent,
                      total: completeness.peopleCount,
                    })}
                  </li>
                  <li>
                    {t("tree.completenessSpouse", {
                      n: completeness.parentsOfKidsWithSpouse,
                      total: Math.max(1, completeness.parentsOfKidsTotal),
                    })}
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-background px-2.5 py-2 text-center">
      <div className="mb-1 flex items-center justify-center gap-1 text-muted-foreground">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
    </div>
  );
}
