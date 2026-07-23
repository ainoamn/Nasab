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
    <FamilyChart
      people={people}
      rels={rels}
      compact
      disablePanZoom
      rootPersonId={rootPersonId}
      printLevels={levels}
    />
  );
}
