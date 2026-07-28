import { useTranslation } from "react-i18next";
import type { Person } from "@db/tables";
import { cn } from "@/lib/utils";
import { History } from "lucide-react";
import { isTwin, twinGroupSize, twinOrderInGroup } from "@/lib/twins";
import TwinBadge from "@/components/tree/TwinBadge";

type Props = {
  people: Person[];
  recentIds: number[];
  onSelect: (person: Person) => void;
  className?: string;
};

/** شريط الأشخاص الذين فُتحوا مؤخراً — تنقّل سريع بأسلوب مواقع النسب */
export default function RecentPeopleStrip({
  people,
  recentIds,
  onSelect,
  className,
}: Props) {
  const { t } = useTranslation();
  const byId = new Map(people.map((p) => [p.id, p]));
  const items = recentIds
    .map((id) => byId.get(id))
    .filter((p): p is Person => !!p)
    .slice(0, 8);

  if (items.length === 0) return null;

  return (
    <div className={cn("mb-4", className)}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <History className="h-3.5 w-3.5" />
        {t("tree.recentPeople")}
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {items.map((p) => {
          const female = p.gender === "female";
          const twin = isTwin(p, people);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelect(p)}
              className={cn(
                "group relative flex w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-muted/60",
                twin && "ring-2 ring-violet-400 bg-violet-50/80",
              )}
              title={p.givenName}
            >
              {twin ? (
                <span className="absolute -top-0.5 start-0.5 z-[2]">
                  <TwinBadge
                    compact
                    order={twinOrderInGroup(p, people)}
                    total={twinGroupSize(p, people)}
                  />
                </span>
              ) : null}
              <span
                className={cn(
                  "flex h-11 w-11 overflow-hidden rounded-full bg-white ring-2 shadow-sm transition group-hover:scale-105",
                  twin ? "ring-violet-400" : female ? "ring-pink-300" : "ring-sky-300",
                )}
              >
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      "flex h-full w-full items-center justify-center text-sm text-white",
                      female ? "bg-pink-500" : "bg-sky-600",
                    )}
                  >
                    {p.givenName.slice(0, 1)}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[11px] font-medium">
                {p.givenName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
