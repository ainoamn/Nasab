import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { buildChildrenOf } from "@/lib/familyGraph";
import { useLabels } from "@/lib/labels";
import { relationToFocus } from "@/lib/relationshipLabel";
import { MhPersonPill } from "@/components/tree/MhPersonPill";
import { cn } from "@/lib/utils";
import { birthSortKey } from "@/lib/birthOrder";

type Props = {
  people: Person[];
  rels: Relationship[];
  focusId: number;
  generations?: number;
  selectedPersonId?: number | null;
  kinshipFocusId?: number | null;
  onPersonClick?: (person: Person) => void;
  onFocusPerson?: (person: Person) => void;
  onHowRelated?: (person: Person) => void;
  onAddChild?: (parentId: number) => void;
};

type Cell = {
  person: Person | null;
  key: string;
  parentId: number | null;
};

/**
 * مخطط أحفاد: الشخص يساراً، الأبناء يميناً عبر أجيال —
 * مقابل مخطط الأسلاف.
 */
export default function DescendantsView({
  people,
  rels,
  focusId,
  generations = 4,
  selectedPersonId,
  kinshipFocusId = null,
  onPersonClick,
  onFocusPerson,
  onHowRelated,
  onAddChild,
}: Props) {
  const { t } = useTranslation();
  const L = useLabels();
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const childrenOf = useMemo(() => buildChildrenOf(rels), [rels]);
  const kinId = kinshipFocusId ?? focusId;

  const columns = useMemo(() => {
    const cols: Cell[][] = [];
    const focus = byId.get(focusId) ?? null;
    cols.push([
      { person: focus, key: `f-${focusId}`, parentId: null },
    ]);

    let frontier = [focusId];
    for (let depth = 1; depth < generations; depth++) {
      const col: Cell[] = [];
      const next: number[] = [];
      for (const parentId of frontier) {
        const kids = [...(childrenOf.get(parentId) ?? [])].sort((a, b) => {
          const pa = byId.get(a);
          const pb = byId.get(b);
          if (!pa || !pb) return a - b;
          return birthSortKey(pa) - birthSortKey(pb);
        });
        if (kids.length === 0) {
          col.push({
            person: null,
            key: `${parentId}-add-${depth}`,
            parentId,
          });
          continue;
        }
        for (const kidId of kids) {
          col.push({
            person: byId.get(kidId) ?? null,
            key: `d-${kidId}`,
            parentId,
          });
          next.push(kidId);
        }
      }
      if (col.length === 0) break;
      cols.push(col);
      frontier = next;
      if (frontier.length === 0) break;
    }
    return cols;
  }, [byId, childrenOf, focusId, generations]);

  return (
    <div className="relative w-full overflow-auto rounded-2xl border border-stone-200 bg-[#ececec]">
      <div className="min-h-[min(70vh,720px)] p-4 sm:p-6">
        <p className="mb-4 text-center text-xs text-stone-500">
          {t("chart.descendantsHint")}
        </p>
        <div className="flex items-stretch justify-start" dir="ltr">
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="flex items-stretch">
              {colIdx > 0 && (
                <div className="relative w-10 sm:w-14 shrink-0 self-stretch">
                  <span className="pointer-events-none absolute start-0 end-0 top-1/2 h-px bg-stone-400/80" />
                  {col.map((cell, i) => {
                    const pct = ((i + 0.5) / col.length) * 100;
                    return (
                      <span
                        key={cell.key}
                        className="pointer-events-none absolute end-0 h-px w-1/2 bg-stone-400/80"
                        style={{ top: `${pct}%` }}
                      />
                    );
                  })}
                  {col.length > 1 && (
                    <span
                      className="pointer-events-none absolute start-1/2 w-px bg-stone-400/80"
                      style={{
                        top: `${(0.5 / col.length) * 100}%`,
                        height: `${((col.length - 1) / col.length) * 100}%`,
                      }}
                    />
                  )}
                </div>
              )}
              <div className={cn("flex flex-col", colIdx === 0 && "pe-1")}>
                <p className="mb-2 text-center text-[10px] font-medium text-stone-500">
                  {colIdx === 0
                    ? t("chart.generationRoot")
                    : t("chart.generationN", { n: colIdx + 1 })}
                </p>
                <div className="flex flex-1 flex-col justify-around gap-3 py-2">
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
                            cell.person != null &&
                            selectedPersonId === cell.person.id
                          }
                          placeholder={t("chart.addChild")}
                          relationLabel={
                            cell.person
                              ? t(
                                  `tree.rel.${relationToFocus(
                                    kinId,
                                    cell.person.id,
                                    people,
                                    rels,
                                  )}`,
                                )
                              : null
                          }
                          onClick={
                            cell.person
                              ? () => onPersonClick?.(cell.person!)
                              : undefined
                          }
                          onFocus={
                            cell.person && onFocusPerson
                              ? () => onFocusPerson(cell.person!)
                              : undefined
                          }
                          onHowRelated={
                            cell.person && onHowRelated
                              ? () => onHowRelated(cell.person!)
                              : undefined
                          }
                          onPlaceholderClick={
                            !cell.person &&
                            cell.parentId != null &&
                            onAddChild
                              ? () => onAddChild(cell.parentId!)
                              : undefined
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
