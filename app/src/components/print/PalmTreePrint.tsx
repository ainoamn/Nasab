import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  buildPalmTreeLayout,
  formatPalmCouple,
  personDisplayName,
} from "@/lib/printData";
import OmaniPalmChart from "./OmaniPalmChart";
import { PALM_FROND_ARCS } from "./palmGeometry";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

export default function PalmTreePrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;
  const { t } = useTranslation();

  const layout = useMemo(
    () => buildPalmTreeLayout(people, rels, levels, rootPersonId),
    [people, rels, levels, rootPersonId],
  );

  const visibleFronds = layout.fronds.slice(0, PALM_FROND_ARCS.length);
  const hiddenFronds = layout.fronds.slice(PALM_FROND_ARCS.length);

  return (
    <div className="print-palm">
      <PrintMetaHeader
        designName={designName}
        tree={tree}
        people={people}
        rels={rels}
        levels={levels}
        today={today}
        accent={accent}
        scopeSummary={scopeSummary}
        className="mb-4 text-center pb-3 border-b-2"
        titleClass="text-2xl md:text-4xl"
      />

      <OmaniPalmChart
        founder={layout.founder}
        fronds={visibleFronds}
        trunkLabel={t("printPage.palmTrunkShort")}
        coupleLabel={t("printPage.palmFrondShort")}
        leafLabel={t("printPage.palmLeafletsShort")}
        accent={accent}
        overflowFronds={hiddenFronds.length}
        overflowNote={t("printPage.palmMoreFronds", { count: hiddenFronds.length })}
      />

      {hiddenFronds.length > 0 && (
        <div
          className="mt-4 mx-auto max-w-3xl rounded-xl border bg-white/90 p-4 print:break-inside-avoid"
          style={{ borderColor: `${accent}44` }}
        >
          <h3 className="font-display text-sm font-bold mb-2" style={{ color: accent }}>
            {t("printPage.palmOverflowTitle")}
          </h3>
          <ul className="grid gap-1 sm:grid-cols-2 text-sm font-display">
            {hiddenFronds.map((f, i) => (
              <li key={i} className="flex flex-wrap gap-x-2 border-b border-stone-100 py-1">
                <span className="text-emerald-800 font-semibold">
                  {formatPalmCouple(f.father, f.mother)}
                </span>
                {f.children.length > 0 && (
                  <span className="text-stone-500 text-xs">
                    ← {f.children.map((c) => personDisplayName(c)).join(" · ")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} today={today} />
    </div>
  );
}
