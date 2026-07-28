import FamilyChart from "@/components/tree/FamilyChart";
import type { PrintTemplateProps } from "./types";

/** FamilyChart مُهيّأ للطباعة — يحترم جذر النسب وأجيال الطباعة */
export default function PrintFamilyChart({
  people,
  rels,
  rootPersonId,
  levels,
}: Pick<PrintTemplateProps, "people" | "rels" | "rootPersonId" | "levels">) {
  return (
    <div className="print-family-chart w-full min-w-0 overflow-hidden print:overflow-hidden">
      <FamilyChart
        people={people}
        rels={rels}
        compact
        disablePanZoom
        rootPersonId={rootPersonId}
        printLevels={levels}
      />
    </div>
  );
}
