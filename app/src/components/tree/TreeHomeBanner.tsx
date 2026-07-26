import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Camera, Image as ImageIcon, Users, Heart, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";

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
  className,
}: Props) {
  const { t } = useTranslation();
  const subtitle = [tribe, region].filter(Boolean).join(" — ");

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
          <p className="text-sm leading-relaxed text-foreground/90 line-clamp-4">
            {description?.trim() || t("tree.aboutFallback")}
          </p>
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
