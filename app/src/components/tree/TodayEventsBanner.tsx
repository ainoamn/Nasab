import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { buildTreeOccasions } from "@/lib/treeOccasions";
import {
  dismissTodayEvents,
  isTodayEventsDismissed,
} from "@/lib/dismissedTodayEvents";
import { Cake, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  treeId: number;
  people: Person[];
  rels: Relationship[];
  onPersonClick: (person: Person) => void;
  className?: string;
};

/** بانر مناسبات اليوم — يظهر مرة واحدة يومياً حتى الإخفاء */
export default function TodayEventsBanner({
  treeId,
  people,
  rels,
  onPersonClick,
  className,
}: Props) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(() => isTodayEventsDismissed(treeId));

  const today = useMemo(
    () => buildTreeOccasions(people, rels).filter((e) => e.daysUntil === 0),
    [people, rels],
  );

  if (hidden || today.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/80 bg-gradient-to-l from-amber-50 to-white px-3 py-2.5 shadow-sm",
        className,
      )}
    >
      <p className="text-sm font-semibold text-amber-950">
        {t("tree.todayEventsTitle")}
      </p>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {today.map((ev) => (
          <button
            key={ev.key}
            type="button"
            onClick={() => ev.person && onPersonClick(ev.person)}
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100/70"
          >
            {ev.kind === "birthday" ? (
              <Cake className="h-3 w-3 shrink-0 text-sky-600" />
            ) : (
              <Heart className="h-3 w-3 shrink-0 text-pink-600" />
            )}
            <span className="truncate">{ev.label}</span>
            <span className="shrink-0 text-amber-800/70">
              {t("tree.eventToday")}
            </span>
          </button>
        ))}
      </div>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0 text-amber-900/70"
        title={t("tree.todayEventsDismiss")}
        onClick={() => {
          dismissTodayEvents(treeId);
          setHidden(true);
        }}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
