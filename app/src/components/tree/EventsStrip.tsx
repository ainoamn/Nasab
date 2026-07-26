import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import type { TreeOccasion } from "@/lib/treeOccasions";
import {
  Cake,
  Heart,
  Flower2,
  Link as LinkIcon,
  Printer,
  CalendarPlus,
  MessageSquare,
  CalendarRange,
  ClipboardList,
  MessageCircle,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTreeOccasions } from "@/lib/treeOccasions";
import { Button } from "@/components/ui/button";

type Props = {
  people: Person[];
  rels: Relationship[];
  onPersonClick?: (person: Person) => void;
  onSeeAll?: () => void;
  onPrintOccasion?: (ev: TreeOccasion) => void;
  onCopyPersonLink?: (person: Person) => void;
  onAddToCalendar?: (ev: TreeOccasion) => void;
  onCopyGreeting?: (ev: TreeOccasion) => void;
  onWhatsAppGreeting?: (ev: TreeOccasion) => void;
  onDownloadUpcomingCalendar?: () => void;
  onDownloadOccasionsCsv?: () => void;
  onCopyFamilyBrief?: () => void;
  onWhatsAppFamilyBrief?: () => void;
  onPrintFamilyBrief?: () => void;
  className?: string;
};

function kindMeta(kind: TreeOccasion["kind"], t: (k: string) => string) {
  if (kind === "memorial") {
    return {
      border: "border-stone-200",
      iconBg: "bg-stone-100 text-stone-700",
      Icon: Flower2,
      label: t("tree.eventMemorial"),
    };
  }
  if (kind === "anniversary") {
    return {
      border: "border-pink-200",
      iconBg: "bg-pink-100 text-pink-700",
      Icon: Heart,
      label: t("tree.eventAnniversary"),
    };
  }
  return {
    border: "border-sky-200",
    iconBg: "bg-sky-100 text-sky-700",
    Icon: Cake,
    label: t("tree.eventBirthday"),
  };
}

/** شريط مناسبات قريبة: ميلاد / زواج / ذكرى + طباعة/رابط/تقويم/تهنئة */
export default function EventsStrip({
  people,
  rels,
  onPersonClick,
  onSeeAll,
  onPrintOccasion,
  onCopyPersonLink,
  onAddToCalendar,
  onCopyGreeting,
  onWhatsAppGreeting,
  onDownloadUpcomingCalendar,
  onDownloadOccasionsCsv,
  onCopyFamilyBrief,
  onWhatsAppFamilyBrief,
  onPrintFamilyBrief,
  className,
}: Props) {
  const { t } = useTranslation();

  const events = useMemo(
    () => buildTreeOccasions(people, rels, { limit: 8 }),
    [people, rels],
  );

  if (events.length === 0) {
    return (
      <div
        className={cn(
          "mb-4 rounded-xl border border-dashed bg-card px-4 py-3 text-sm text-muted-foreground",
          className,
        )}
      >
        {t("tree.eventsEmpty")}
      </div>
    );
  }

  const hasActions =
    onPrintOccasion ||
    onCopyPersonLink ||
    onAddToCalendar ||
    onCopyGreeting ||
    onWhatsAppGreeting;

  return (
    <div className={cn("mb-4", className)}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t("tree.eventsTitle")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] text-muted-foreground">{t("tree.eventsHint")}</p>
          {onCopyFamilyBrief && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={onCopyFamilyBrief}
            >
              <ClipboardList className="h-3 w-3" />
              {t("tree.copyFamilyBrief")}
            </Button>
          )}
          {onWhatsAppFamilyBrief && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={onWhatsAppFamilyBrief}
            >
              <MessageCircle className="h-3 w-3" />
              {t("tree.whatsAppFamilyBrief")}
            </Button>
          )}
          {onPrintFamilyBrief && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={onPrintFamilyBrief}
            >
              <Printer className="h-3 w-3" />
              {t("tree.printFamilyBrief")}
            </Button>
          )}
          {onDownloadUpcomingCalendar && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={onDownloadUpcomingCalendar}
            >
              <CalendarRange className="h-3 w-3" />
              {t("tree.occasionsDownload90")}
            </Button>
          )}
          {onDownloadOccasionsCsv && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={onDownloadOccasionsCsv}
            >
              <FileSpreadsheet className="h-3 w-3" />
              {t("tree.occasionsDownloadCsv")}
            </Button>
          )}
          {onSeeAll && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={onSeeAll}
            >
              {t("tree.eventsSeeAll")}
            </Button>
          )}
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {events.map((ev) => {
          const meta = kindMeta(ev.kind, t);
          const Icon = meta.Icon;
          return (
            <div
              key={ev.key}
              className={cn(
                "flex min-w-[11rem] shrink-0 items-stretch gap-1 rounded-xl border bg-card px-2 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                meta.border,
                ev.daysUntil === 0 && "ring-1 ring-amber-400/60",
              )}
            >
              <button
                type="button"
                onClick={() => ev.person && onPersonClick?.(ev.person)}
                className="flex min-w-0 flex-1 items-center gap-2 text-start"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    meta.iconBg,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">
                    {ev.label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {meta.label}
                    {" · "}
                    {ev.daysUntil === 0
                      ? t("tree.eventToday")
                      : t("tree.eventInDays", { n: ev.daysUntil })}
                  </span>
                </span>
              </button>
              {ev.person && hasActions && (
                <div className="flex flex-col justify-center gap-0.5 border-s ps-1">
                  {onAddToCalendar && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      title={t("tree.occasionsAddCalendar")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCalendar(ev);
                      }}
                    >
                      <CalendarPlus className="h-3 w-3" />
                    </Button>
                  )}
                  {onCopyGreeting && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      title={t("tree.occasionsCopyGreeting")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyGreeting(ev);
                      }}
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  )}
                  {onWhatsAppGreeting && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      title={t("tree.occasionsWhatsApp")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onWhatsAppGreeting(ev);
                      }}
                    >
                      <MessageCircle className="h-3 w-3" />
                    </Button>
                  )}
                  {onPrintOccasion && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      title={t("tree.occasionsPrint")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPrintOccasion(ev);
                      }}
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                  )}
                  {onCopyPersonLink && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      title={t("detail.copyPersonLink")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyPersonLink(ev.person!);
                      }}
                    >
                      <LinkIcon className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
