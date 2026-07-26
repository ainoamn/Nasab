import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { Cake, Heart, Network, Printer, Gift, CalendarPlus, MessageSquare, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  buildTreeOccasions,
  groupOccasionsByMonth,
  type TreeOccasion,
} from "@/lib/treeOccasions";

type Props = {
  people: Person[];
  rels: Relationship[];
  onPersonClick: (person: Person) => void;
  onPrintOccasion?: (person: Person) => void;
  onAddToCalendar?: (ev: TreeOccasion) => void;
  onCopyGreeting?: (ev: TreeOccasion) => void;
  onDownloadUpcomingCalendar?: () => void;
};

const MONTH_KEYS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

/** تبويب المناسبات الكامل — السنة القادمة مجمّعة بالأشهر */
export default function OccasionsPanel({
  people,
  rels,
  onPersonClick,
  onPrintOccasion,
  onAddToCalendar,
  onCopyGreeting,
  onDownloadUpcomingCalendar,
}: Props) {
  const { t } = useTranslation();
  const events = useMemo(() => buildTreeOccasions(people, rels), [people, rels]);
  const groups = useMemo(() => groupOccasionsByMonth(events), [events]);
  const upcoming = events.filter((e) => e.daysUntil <= 30);

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <Gift className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">{t("tree.occasionsEmpty")}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("tree.occasionsEmptyHint")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t("tree.occasionsTitle")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("tree.occasionsHint", {
              total: events.length,
              soon: upcoming.length,
            })}
          </p>
        </div>
        {onDownloadUpcomingCalendar && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 text-xs"
            onClick={onDownloadUpcomingCalendar}
          >
            <CalendarRange className="h-3.5 w-3.5" />
            {t("tree.occasionsDownload90")}
          </Button>
        )}
      </div>

      {upcoming.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3">
          <p className="mb-2 text-xs font-semibold text-amber-950">
            {t("tree.occasionsSoon")}
          </p>
          <div className="flex flex-wrap gap-2">
            {upcoming.slice(0, 6).map((ev) => (
              <button
                key={`soon-${ev.key}`}
                type="button"
                onClick={() => ev.person && onPersonClick(ev.person)}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100/60"
              >
                {ev.kind === "birthday" ? (
                  <Cake className="h-3 w-3 text-sky-600" />
                ) : (
                  <Heart className="h-3 w-3 text-pink-600" />
                )}
                <span className="max-w-[8rem] truncate">{ev.label}</span>
                <span className="text-amber-800/70">
                  {ev.daysUntil === 0
                    ? t("tree.eventToday")
                    : t("tree.eventInDays", { n: ev.daysUntil })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {groups.map(({ month, items }) => (
        <section key={month} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t(`tree.month.${MONTH_KEYS[month - 1]}`)}
            <span className="ms-1.5 font-normal normal-case">
              ({items.length})
            </span>
          </h4>
          <ul className="space-y-2">
            {items.map((ev) => (
              <li
                key={ev.key}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm",
                  ev.kind === "birthday" ? "border-sky-100" : "border-pink-100",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    ev.kind === "birthday"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-pink-100 text-pink-700",
                  )}
                >
                  {ev.kind === "birthday" ? (
                    <Cake className="h-4 w-4" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{ev.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ev.day}/{ev.month}
                    {" · "}
                    {ev.kind === "birthday"
                      ? t("tree.eventBirthday")
                      : t("tree.eventAnniversary")}
                    {" · "}
                    {ev.daysUntil === 0
                      ? t("tree.eventToday")
                      : t("tree.eventInDays", { n: ev.daysUntil })}
                  </p>
                </div>
                {ev.person && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => onPersonClick(ev.person!)}
                    >
                      <Network className="h-3 w-3" />
                      {t("detail.showOnChart")}
                    </Button>
                    {onAddToCalendar && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        onClick={() => onAddToCalendar(ev)}
                      >
                        <CalendarPlus className="h-3 w-3" />
                        {t("tree.occasionsAddCalendar")}
                      </Button>
                    )}
                    {onCopyGreeting && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        onClick={() => onCopyGreeting(ev)}
                      >
                        <MessageSquare className="h-3 w-3" />
                        {t("tree.occasionsCopyGreeting")}
                      </Button>
                    )}
                    {onPrintOccasion && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs"
                        onClick={() => onPrintOccasion(ev.person!)}
                      >
                        <Printer className="h-3 w-3" />
                        {t("tree.occasionsPrint")}
                      </Button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
