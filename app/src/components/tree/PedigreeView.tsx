import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { getParents } from "@/lib/familyGraph";
import { useLabels } from "@/lib/labels";
import { MhPersonPill } from "@/components/tree/MhPersonPill";
import { cn } from "@/lib/utils";

type Props = {
  people: Person[];
  rels: Relationship[];
  focusId: number;
  generations?: number;
  selectedPersonId?: number | null;
  onPersonClick?: (person: Person) => void;
};

/**
 * مخطط أسلاف أفقي (RTL): الشخص في اليمين، الآباء يساراً بخطوط متعامدة بلا أسهم.
 */
export default function PedigreeView({
  people,
  rels,
  focusId,
  generations = 4,
  selectedPersonId,
  onPersonClick,
}: Props) {
  const { t } = useTranslation();
  const L = useLabels();
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const columns = useMemo(() => {
    const cols: Array<Array<{ person: Person | null; key: string; slot: string }>> = [];
    const focus = byId.get(focusId) ?? null;
    cols.push([{ person: focus, key: `f-${focusId}`, slot: "focus" }]);

    let frontier: Array<{ id: number | null; key: string }> = [
      { id: focusId, key: `f-${focusId}` },
    ];

    for (let depth = 1; depth < generations; depth++) {
      const next: Array<{ id: number | null; key: string }> = [];
      const col: Array<{ person: Person | null; key: string; slot: string }> = [];
      for (const item of frontier) {
        if (item.id == null) {
          col.push({ person: null, key: `${item.key}-fa`, slot: "father" });
          col.push({ person: null, key: `${item.key}-mo`, slot: "mother" });
          next.push({ id: null, key: `${item.key}-fa` });
          next.push({ id: null, key: `${item.key}-mo` });
          continue;
        }
        const { fatherId, motherId } = getParents(item.id, rels, byId);
        col.push({
          person: fatherId ? byId.get(fatherId) ?? null : null,
          key: `${item.key}-fa`,
          slot: "father",
        });
        col.push({
          person: motherId ? byId.get(motherId) ?? null : null,
          key: `${item.key}-mo`,
          slot: "mother",
        });
        next.push({ id: fatherId, key: `${item.key}-fa` });
        next.push({ id: motherId, key: `${item.key}-mo` });
      }
      cols.push(col);
      frontier = next;
    }
    return cols;
  }, [byId, focusId, generations, rels]);

  return (
    <div className="relative w-full overflow-auto rounded-2xl border border-stone-200 bg-[#ececec]">
      <div className="min-h-[min(70vh,720px)] p-4 sm:p-6">
        <p className="mb-4 text-center text-xs text-stone-500">
          {t("chart.pedigreeHint")}
        </p>
        <div className="flex flex-row-reverse items-stretch justify-start gap-0" dir="ltr">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex items-stretch">
              {colIdx > 0 && (
                <div className="relative w-10 sm:w-14 shrink-0">
                  {/* خطوط متعامدة بين الأعمدة */}
                  <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-stone-400/80" />
                </div>
              )}
              <div
                className={cn(
                  "flex flex-col justify-around gap-3 py-2",
                  colIdx === 0 && "ps-2",
                )}
              >
                {col.map((cell) => {
                  const years = cell.person
                    ? L.formatYears(
                        cell.person.birthYear,
                        cell.person.deathYear,
                        cell.person.isLiving,
                      )
                    : null;
                  return (
                    <div key={cell.key} className="relative flex items-center">
                      {colIdx > 0 && (
                        <span className="absolute -start-5 sm:-start-7 top-1/2 h-px w-5 sm:w-7 bg-stone-400/80" />
                      )}
                      <MhPersonPill
                        person={cell.person}
                        years={years || null}
                        selected={
                          cell.person != null &&
                          selectedPersonId === cell.person.id
                        }
                        placeholder={
                          cell.slot === "father"
                            ? t("chart.addFather")
                            : cell.slot === "mother"
                              ? t("chart.addMother")
                              : "—"
                        }
                        onClick={
                          cell.person
                            ? () => onPersonClick?.(cell.person!)
                            : undefined
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
