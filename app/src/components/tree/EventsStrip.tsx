import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { Cake, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildTreeOccasions } from "@/lib/treeOccasions";
import { Button } from "@/components/ui/button";

type Props = {
  people: Person[];
  rels: Relationship[];
  onPersonClick?: (person: Person) => void;
  onSeeAll?: () => void;
  className?: string;
};

/** شريط مناسبات قريبة: أعياد ميلاد وذكريات زواج */
export default function EventsStrip({
  people,
  rels,
  onPersonClick,
  onSeeAll,
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

  return (
    <div className={cn("mb-4", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t("tree.eventsTitle")}</p>
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-muted-foreground">{t("tree.eventsHint")}</p>
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
        {events.map((ev) => (
          <button
            key={ev.key}
            type="button"
            onClick={() => ev.person && onPersonClick?.(ev.person)}
            className={cn(
              "flex min-w-[9.5rem] shrink-0 items-center gap-2 rounded-xl border bg-card px-3 py-2 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
              ev.kind === "birthday" ? "border-sky-200" : "border-pink-200",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
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
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold">
                {ev.label}
              </span>
              <span className="block text-[10px] text-muted-foreground">
                {ev.kind === "birthday"
                  ? t("tree.eventBirthday")
                  : t("tree.eventAnniversary")}
                {" · "}
                {ev.daysUntil === 0
                  ? t("tree.eventToday")
                  : t("tree.eventInDays", { n: ev.daysUntil })}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
