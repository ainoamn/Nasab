import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import {
  comparePeopleByBirth,
  computePersonRanks,
  formatAgeOrLifespan,
  formatSiblingLabel,
} from "@/lib/birthOrder";
import { isTwin, twinOrderInGroup, twinGroupSize } from "@/lib/twins";
import TwinBadge from "@/components/tree/TwinBadge";
import { cn } from "@/lib/utils";

type Props = {
  siblings: Person[];
  focusId: number;
  people: Person[];
  rels: Relationship[];
  onSelect: (person: Person) => void;
  className?: string;
};

/** شريط إخوة مرتّبين بالميلاد مع ترتيب وعمر وتمييز الشخص الحالي */
export default function BirthOrderStrip({
  siblings,
  focusId,
  people,
  rels,
  onSelect,
  className,
}: Props) {
  const { t } = useTranslation();

  const ordered = useMemo(
    () => [...siblings].sort(comparePeopleByBirth),
    [siblings],
  );

  const chips = useMemo(() => {
    return ordered.map((p) => {
      const ranks = computePersonRanks(p, people, rels);
      const ord = formatSiblingLabel(p, people, ranks, t("twins.badge"));
      const age = formatAgeOrLifespan(p);
      const metaParts: string[] = [];
      if (ord) metaParts.push(ord);
      if (age) {
        metaParts.push(p.isLiving ? t("detail.ageYears", { n: age }) : age);
      }
      return {
        person: p,
        meta: metaParts.join(" · ") || null,
        focused: p.id === focusId,
        twin: isTwin(p, people),
        twinOrder: twinOrderInGroup(p, people),
        twinTotal: twinGroupSize(p, people),
      };
    });
  }, [ordered, people, rels, focusId, t]);

  if (chips.length < 2) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-semibold">
        {t("detail.birthOrderTitle")}
        <span className="ms-1 text-xs font-normal text-muted-foreground">
          ({chips.length})
        </span>
      </p>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {chips.map(({ person, meta, focused, twin, twinOrder, twinTotal }) => {
          const female = person.gender === "female";
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelect(person)}
              title={
                meta
                  ? `${person.givenName} · ${meta}`
                  : person.givenName
              }
              className={cn(
                "group relative flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 transition",
                focused
                  ? "bg-sky-100/90 ring-1 ring-sky-300"
                  : "hover:bg-white/80",
                twin && "ring-2 ring-violet-400 bg-violet-50/80",
              )}
            >
              {twin && (
                <span className="absolute -top-0.5 start-0.5 z-[2]">
                  <TwinBadge compact order={twinOrder} total={twinTotal} />
                </span>
              )}
              <span
                className={cn(
                  "flex h-12 w-12 overflow-hidden rounded-full bg-white ring-2 shadow-sm transition group-hover:scale-105",
                  focused
                    ? "ring-amber-400"
                    : female
                      ? "ring-pink-300"
                      : "ring-sky-300",
                )}
              >
                {person.photoUrl ? (
                  <img
                    src={person.photoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className={cn(
                      "flex h-full w-full items-center justify-center text-white",
                      female ? "bg-pink-500" : "bg-sky-600",
                    )}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill="currentColor"
                      aria-hidden
                    >
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M5 19.5c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5" />
                    </svg>
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-[11px] font-medium leading-tight",
                  focused ? "text-sky-950" : "text-stone-900",
                )}
              >
                {person.givenName}
              </span>
              {meta && (
                <span className="w-full truncate text-center text-[9px] font-medium tabular-nums text-sky-800/80">
                  {meta}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
