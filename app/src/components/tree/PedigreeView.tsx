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

type Cell = { person: Person | null; key: string; slot: string };

/**
 * مخطط أسلاف أفقي: الشخص يميناً، الآباء يساراً،
 * خطوط متعامدة من منتصف العمود — بلا أسهم.
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
    const cols: Cell[][] = [];
    const focus = byId.get(focusId) ?? null;
    cols.push([{ person: focus, key: `f-${focusId}`, slot: "focus" }]);

    let frontier: Array<{ id: number | null; key: string }> = [
      { id: focusId, key: `f-${focusId}` },
    ];

    for (let depth = 1; depth < generations; depth++) {
      const next: Array<{ id: number | null; key: string }> = [];
      const col: Cell[] = [];
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
        <p className="mb-4 text-center text-xs text-stone-500">{t("chart.pedigreeHint")}</p>
        <div className="flex flex-row-reverse items-stretch justify-start" dir="ltr">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex items-stretch">
              {colIdx > 0 && (
                <div className="relative w-12 sm:w-16 shrink-0 self-stretch">
                  {/* جذع عمودي في منتصف الفجوة يربط أزواج الآباء بالابن */}
                  {Array.from({ length: col.length / 2 }, (_, pair) => {
                    const topPct = ((pair * 2 + 0.5) / col.length) * 100;
                    const botPct = ((pair * 2 + 1.5) / col.length) * 100;
                    const midPct = (topPct + botPct) / 2;
                    return (
                      <div key={pair} className="pointer-events-none absolute inset-0">
                        <span
                          className="absolute start-0 h-px w-1/2 bg-stone-400/90"
                          style={{ top: `${topPct}%` }}
                        />
                        <span
                          className="absolute start-0 h-px w-1/2 bg-stone-400/90"
                          style={{ top: `${botPct}%` }}
                        />
                        <span
                          className="absolute start-1/2 w-px bg-stone-400/90"
                          style={{
                            top: `${topPct}%`,
                            height: `${botPct - topPct}%`,
                          }}
                        />
                        <span
                          className="absolute start-1/2 end-0 h-px bg-stone-400/90"
                          style={{ top: `${midPct}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
              <div
                className={cn(
                  "flex flex-col justify-around gap-4 py-2",
                  colIdx === 0 && "ps-1",
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
                      <MhPersonPill
                        person={cell.person}
                        years={years || null}
                        selected={
                          cell.person != null && selectedPersonId === cell.person.id
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
