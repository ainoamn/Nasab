import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import PrintFamilyChart from "./PrintFamilyChart";
import {
  displayGenerationNumber,
  generationColor,
  groupByGeneration,
  personDisplayNameWithTwin,
} from "@/lib/printData";
import { twinMarkWord } from "@/lib/twins";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

export default function PosterPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;
  const { i18n } = useTranslation();
  const twinWord = twinMarkWord(i18n.language);

  const genGroups = useMemo(() => groupByGeneration(people, levels), [people, levels]);

  const maxCount = Math.max(1, ...genGroups.map((g) => g.people.length));

  return (
    <div>
      <PrintMetaHeader
        designName={designName}
        tree={tree}
        people={people}
        rels={rels}
        levels={levels}
        rootPersonId={rootPersonId}
        today={today}
        accent={accent}
        scopeSummary={scopeSummary}
        className="mb-8 text-center pb-6 bg-gradient-to-b from-blue-50 to-transparent rounded-2xl p-6"
        titleClass="text-5xl md:text-7xl"
      />

      {/* أعمدة الأجيال */}
      <div className="flex items-end justify-center gap-2 sm:gap-4 mb-10 min-h-[280px] px-2">
        {genGroups.map((group) => {
          const color = generationColor(group.level);
          const heightPct = Math.max(20, (group.people.length / maxCount) * 100);
          return (
            <div key={group.level} className="flex flex-col items-center flex-1 max-w-[120px]">
              <div className="flex flex-col-reverse gap-0.5 mb-1 w-full max-h-48 overflow-hidden">
                {group.people.slice(0, 6).map((p) => (
                  <span
                    key={p.id}
                    className="text-[8px] sm:text-[9px] text-white text-center truncate px-1 py-0.5 rounded font-display"
                    style={{ backgroundColor: color }}
                    title={personDisplayNameWithTwin(p, people, twinWord)}
                  >
                    {personDisplayNameWithTwin(p, people, twinWord)}
                  </span>
                ))}
                {group.people.length > 6 && (
                  <span className="text-[8px] text-center text-stone-400">+{group.people.length - 6}</span>
                )}
              </div>
              <div
                className="w-full rounded-t-lg transition-all shadow-lg print:shadow-none"
                style={{
                  height: `${heightPct * 2}px`,
                  minHeight: "40px",
                  background: `linear-gradient(180deg, ${color} 0%, ${color}99 100%)`,
                }}
              />
              <span className="mt-2 text-[10px] font-bold" style={{ color }}>
                {displayGenerationNumber(group.level)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border p-4 bg-white shadow-lg print:shadow-none" style={{ borderColor: accent }}>
        <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} rootPersonId={rootPersonId} today={today} />
    </div>
  );
}
