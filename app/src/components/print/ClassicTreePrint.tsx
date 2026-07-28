import { useTranslation } from "react-i18next";
import PrintFamilyChart from "./PrintFamilyChart";
import { PrintMetaFooter, PrintStatsBar } from "./shared";
import type { PrintTemplateProps } from "./types";

export default function ClassicTreePrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;
  const { t } = useTranslation();

  return (
    <div>
      <div
        className="mb-6 rounded-xl overflow-hidden shadow-lg border-2"
        style={{ borderColor: accent }}
      >
        <div
          className="px-6 py-4 text-center text-white"
          style={{ background: `linear-gradient(180deg, ${accent} 0%, ${accent}dd 100%)` }}
        >
          <p className="text-xs uppercase tracking-[0.25em] opacity-80 mb-1">{designName}</p>
          <h1 className="font-display text-2xl sm:text-4xl font-bold">
            {t("printPage.classicTitle", { name: tree.name })}
          </h1>
          <p className="font-display text-base sm:text-lg mt-1 opacity-90">
            {[tree.tribe, tree.region].filter(Boolean).join(" — ")}
          </p>
        </div>
        <div className="bg-white px-4 py-3 border-t">
          <PrintStatsBar people={people} levels={levels} rels={rels} rootPersonId={rootPersonId} today={today} accent={accent} />
        </div>
        {scopeSummary && (
          <p className="bg-stone-50 px-4 py-2 text-[10px] text-stone-400 text-center border-t">
            {scopeSummary}
          </p>
        )}
      </div>

      <div
        className="rounded-2xl border-2 p-4 sm:p-6 bg-white shadow-inner"
        style={{ borderColor: `${accent}44` }}
      >
        <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} rootPersonId={rootPersonId} today={today} />
    </div>
  );
}
