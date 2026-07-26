import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { clusterByBirthPlace } from "@/lib/printData";
import { relationToFocus } from "@/lib/relationshipLabel";
import { MapPin, Network, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  people: Person[];
  rels: Relationship[];
  kinshipFocusId?: number | null;
  onPersonClick: (person: Person) => void;
  onPrintMap?: () => void;
};

/** تبويب الأماكن — تجميع بالميلاد/الوفاة مع قرابة وانتقال للمخطط */
export default function PlacesBrowser({
  people,
  rels,
  kinshipFocusId = null,
  onPersonClick,
  onPrintMap,
}: Props) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");

  const clusters = useMemo(() => {
    const all = clusterByBirthPlace(people);
    const query = q.trim().toLowerCase();
    if (!query) return all;
    return all.filter(
      (c) =>
        c.place.toLowerCase().includes(query) ||
        c.people.some((p) =>
          [p.givenName, p.fatherName]
            .filter(Boolean)
            .some((s) => s!.toLowerCase().includes(query)),
        ),
    );
  }, [people, q]);

  if (clusterByBirthPlace(people).length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-16 text-center">
          <MapPin className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">{t("tree.placesEmpty")}</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("tree.placesEmptyHint")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t("tree.placesTitle")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("tree.placesHint", { count: clusters.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("tree.placesSearch")}
              className="h-9 pe-8 text-sm"
            />
          </div>
          {onPrintMap && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={onPrintMap}
            >
              <Printer className="h-3.5 w-3.5" />
              {t("tree.placesPrintMap")}
            </Button>
          )}
        </div>
      </div>

      {clusters.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {t("tree.noResults")}
        </p>
      ) : (
        <ul className="space-y-3">
          {clusters.map((c) => (
            <li
              key={c.place}
              className="overflow-hidden rounded-2xl border bg-card shadow-sm"
            >
              <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2.5">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-700" />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {c.place}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {t("tree.placesPeople", { count: c.count })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 p-3">
                {c.people.map((p) => {
                  const rel =
                    kinshipFocusId != null
                      ? t(
                          `tree.rel.${relationToFocus(
                            kinshipFocusId,
                            p.id,
                            people,
                            rels,
                          )}`,
                        )
                      : null;
                  const female = p.gender === "female";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onPersonClick(p)}
                      className="group flex w-[5.5rem] flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-muted/60"
                      title={rel ? `${p.givenName} — ${rel}` : p.givenName}
                    >
                      <span
                        className={cn(
                          "flex h-12 w-12 overflow-hidden rounded-full bg-white ring-2 shadow-sm transition group-hover:scale-105",
                          female ? "ring-pink-300" : "ring-sky-300",
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
                      {rel && (
                        <span className="max-w-full truncate rounded-full bg-sky-50 px-1.5 py-px text-[9px] text-sky-800">
                          {rel}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t px-3 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    const first = c.people[0];
                    if (first) onPersonClick(first);
                  }}
                >
                  <Network className="h-3 w-3" />
                  {t("detail.showOnChart")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
