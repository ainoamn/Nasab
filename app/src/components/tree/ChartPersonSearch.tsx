import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Star, House, History } from "lucide-react";
import type { Person, Relationship } from "@db/tables";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { personMatchesQuery } from "@/lib/personDisplay";
import { relationToFocus } from "@/lib/relationshipLabel";
import { isTwin, twinGroupSize, twinOrderInGroup } from "@/lib/twins";
import TwinBadge from "@/components/tree/TwinBadge";

type Props = {
  people: Person[];
  onSelect: (person: Person) => void;
  favoriteIds?: number[];
  recentIds?: number[];
  homePersonId?: number | null;
  /** محور تسمية القرابة (افتراضي: شخص البيت) */
  kinshipFocusId?: number | null;
  rels?: Relationship[];
  className?: string;
};

type Ranked = {
  person: Person;
  rank: number;
  badge?: "home" | "favorite" | "recent";
};

/** بحث فوري بأسلوب مواقع النسب — ترتيب شخصي + شارة قرابة */
export default function ChartPersonSearch({
  people,
  onSelect,
  favoriteIds = [],
  recentIds = [],
  homePersonId = null,
  kinshipFocusId = null,
  rels = [],
  className,
}: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const favSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const recentIndex = useMemo(() => {
    const m = new Map<number, number>();
    recentIds.forEach((id, i) => m.set(id, i));
    return m;
  }, [recentIds]);

  const kinId = kinshipFocusId ?? homePersonId;

  const results = useMemo((): Ranked[] => {
    const query = q.trim();
    const score = (p: Person): Ranked => {
      let rank = 50;
      let badge: Ranked["badge"];
      if (homePersonId != null && p.id === homePersonId) {
        rank = 0;
        badge = "home";
      } else if (favSet.has(p.id)) {
        rank = 1;
        badge = "favorite";
      } else if (recentIndex.has(p.id)) {
        rank = 10 + (recentIndex.get(p.id) ?? 0);
        badge = "recent";
      }
      if (query) {
        const name = p.givenName.toLowerCase();
        const ql = query.toLowerCase();
        if (name.startsWith(ql)) rank -= 5;
      }
      return { person: p, rank, badge };
    };

    if (query.length < 1) {
      const ids: number[] = [];
      const push = (id: number | null | undefined) => {
        if (id == null || ids.includes(id)) return;
        ids.push(id);
      };
      push(homePersonId);
      for (const id of favoriteIds) push(id);
      for (const id of recentIds) push(id);
      return ids
        .map((id) => people.find((p) => p.id === id))
        .filter((p): p is Person => !!p)
        .map(score)
        .slice(0, 8);
    }

    return people
      .filter((p) => personMatchesQuery(p, query))
      .map(score)
      .sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.person.givenName.localeCompare(b.person.givenName, "ar");
      })
      .slice(0, 8);
  }, [
    people,
    q,
    favSet,
    recentIndex,
    homePersonId,
    favoriteIds,
    recentIds,
  ]);

  const pick = (p: Person) => {
    onSelect(p);
    setQ("");
    setOpen(false);
  };

  return (
    <div className={cn("relative w-full max-w-xs", className)}>
      <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        placeholder={t("chart.searchInTree")}
        className="h-8 pe-8 text-sm"
        id="chart-person-search"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-card py-1 shadow-lg">
          {q.trim().length < 1 && (
            <li className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("chart.searchSuggestions")}
            </li>
          )}
          {results.map(({ person: p, badge }) => {
            const rel =
              kinId != null && rels.length > 0
                ? t(`tree.rel.${relationToFocus(kinId, p.id, people, rels)}`)
                : null;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(p)}
                >
                  <span
                    className={cn(
                      "relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] text-white",
                      p.gender === "female" ? "bg-pink-500" : "bg-sky-600",
                    )}
                  >
                    {p.photoUrl ? (
                      <img
                        src={p.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      p.givenName.slice(0, 1)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 truncate font-medium">
                      {p.givenName}
                      {isTwin(p, people) ? (
                        <TwinBadge
                          compact
                          order={twinOrderInGroup(p, people)}
                          total={twinGroupSize(p, people)}
                        />
                      ) : null}
                      {badge === "home" && (
                        <House className="h-3 w-3 shrink-0 text-emerald-600" />
                      )}
                      {badge === "favorite" && (
                        <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-500" />
                      )}
                      {badge === "recent" && (
                        <History className="h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                      {rel && (
                        <span className="rounded-full bg-sky-50 px-1.5 py-px text-[10px] font-medium text-sky-800">
                          {rel}
                        </span>
                      )}
                      {p.fatherName && (
                        <span className="truncate">{p.fatherName}</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
