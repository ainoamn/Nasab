import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  displayGenerationNumber,
  fullNasabName,
  pedigreeColumns,
  sortPeopleByGeneration,
} from "@/lib/printData";
import { PrintPersonCard } from "./PrintPersonCard";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

function generationListLabel(
  level: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (level < 0) return t("printPage.ancestorLabel", { n: Math.abs(level) });
  return String(displayGenerationNumber(level));
}

export default function PedigreeRollPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, scopeSummary, accent, designName, today } = props;
  const { t } = useTranslation();

  const columns = useMemo(() => pedigreeColumns(people, levels), [people, levels]);
  const sortedPeople = useMemo(
    () => sortPeopleByGeneration(people, levels),
    [people, levels],
  );

  return (
    <div>
      <PrintMetaHeader
        designName={designName}
        tree={tree}
        people={people}
        rels={rels}
        levels={levels}
        today={today}
        accent={accent}
        scopeSummary={scopeSummary}
        className="mb-6 text-center pb-4 border-b-4 border-double"
        titleClass="text-3xl md:text-4xl"
      />

      <div
        className="mb-8 rounded-xl border bg-white/90 p-4 sm:p-6 print:break-inside-avoid"
        style={{ borderColor: `${accent}55` }}
      >
        <h2 className="font-display text-lg font-bold mb-4 text-center" style={{ color: accent }}>
          {t("printPage.pedigreeListTitle")}
        </h2>
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-x-6 space-y-1">
          {sortedPeople.map((p) => {
            const level = levels.get(p.id) ?? 0;
            return (
              <p
                key={p.id}
                className="font-display text-sm py-0.5 break-inside-avoid border-b border-stone-100 last:border-0"
              >
                <span className="text-stone-400 text-xs me-2">
                  {generationListLabel(level, t)}
                </span>
                {fullNasabName(p, tree.tribe)}
                {p.birthYear && (
                  <span className="text-stone-400 text-xs ms-1">
                    ({p.isLiving ? p.birthYear : `${p.birthYear}${p.deathYear ? `–${p.deathYear}` : ""}`})
                  </span>
                )}
              </p>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto pb-4 print:overflow-visible">
        <div className="flex flex-wrap print:flex-wrap gap-3 sm:gap-4 min-w-max print:min-w-0 px-2 print:justify-center">
          {columns.map((col) => (
            <div key={col.level} className="flex flex-col gap-2 min-w-[10rem] max-w-[12rem] print:break-inside-avoid">
              <div
                className="text-center rounded-lg py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {col.level < 0
                  ? t("printPage.ancestorLabel", { n: Math.abs(col.level) })
                  : t("printPage.generationLabel", { n: displayGenerationNumber(col.level) })}
              </div>
              {col.people.map((p) => (
                <PrintPersonCard
                  key={p.id}
                  person={p}
                  laqabFallback={tree.tribe}
                  genLevel={col.level}
                  variant="pedigree"
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} today={today} />
    </div>
  );
}
