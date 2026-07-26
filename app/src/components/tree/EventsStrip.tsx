import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { Cake, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  people: Person[];
  rels: Relationship[];
  onPersonClick?: (person: Person) => void;
  className?: string;
};

type EventItem = {
  key: string;
  kind: "birthday" | "anniversary";
  month: number;
  day: number;
  label: string;
  person?: Person;
  sortKey: number;
};

function daysFromToday(month: number, day: number): number {
  const now = new Date();
  const y = now.getFullYear();
  let next = new Date(y, month - 1, day);
  const today = new Date(y, now.getMonth(), now.getDate());
  if (next < today) next = new Date(y + 1, month - 1, day);
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}

/** شريط مناسبات قريبة: أعياد ميلاد وذكريات زواج */
export default function EventsStrip({
  people,
  rels,
  onPersonClick,
  className,
}: Props) {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const events = useMemo(() => {
    const list: EventItem[] = [];
    for (const p of people) {
      if (p.birthMonth && p.birthDay) {
        const delta = daysFromToday(p.birthMonth, p.birthDay);
        list.push({
          key: `b-${p.id}`,
          kind: "birthday",
          month: p.birthMonth,
          day: p.birthDay,
          label: p.givenName,
          person: p,
          sortKey: delta,
        });
      }
    }
    for (const r of rels) {
      if (r.type !== "spouse") continue;
      const mm = r.marriageMonth;
      const md = r.marriageDay;
      if (!mm || !md) continue;
      const a = byId.get(r.fromPersonId);
      const b = byId.get(r.toPersonId);
      if (!a || !b) continue;
      const delta = daysFromToday(mm, md);
      list.push({
        key: `m-${r.id}`,
        kind: "anniversary",
        month: mm,
        day: md,
        label: `${a.givenName} × ${b.givenName}`,
        person: a,
        sortKey: delta,
      });
    }
    return list.sort((x, y) => x.sortKey - y.sortKey).slice(0, 8);
  }, [people, rels, byId]);

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
        <p className="text-[11px] text-muted-foreground">{t("tree.eventsHint")}</p>
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
                {ev.sortKey === 0
                  ? t("tree.eventToday")
                  : t("tree.eventInDays", { n: ev.sortKey })}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
