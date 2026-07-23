import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  computeFanLayout,
  fullNasabName,
  groupByGeneration,
} from "@/lib/printData";
import { PrintPersonCard } from "./PrintPersonCard";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

function FanArcs({ genCount }: { genCount: number }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full opacity-20"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      {Array.from({ length: genCount }, (_, i) => {
        const r = 6 + i * 11;
        const cx = 50;
        const cy = 92;
        const start = (-165 * Math.PI) / 180;
        const end = (-15 * Math.PI) / 180;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        return (
          <path
            key={i}
            d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
            fill="none"
            stroke="#0F5132"
            strokeWidth="0.4"
          />
        );
      })}
    </svg>
  );
}

export default function FanChartPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;
  const { t } = useTranslation();

  const layout = useMemo(
    () => computeFanLayout(people, levels, rootPersonId),
    [people, levels, rootPersonId],
  );
  const groups = useMemo(() => groupByGeneration(people, levels), [people, levels]);
  const rootPerson = people.find((p) => p.id === rootPersonId);
  const rootLabel = rootPerson
    ? fullNasabName(rootPerson, tree.tribe)
    : tree.name;

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
        className="mb-4 text-center pb-4 border-b-2"
        titleClass="text-3xl md:text-4xl"
      />

      <div
        className="relative mx-auto rounded-2xl border-2 overflow-hidden print:overflow-visible"
        style={{
          borderColor: `${accent}55`,
          background: "radial-gradient(ellipse at 50% 100%, #e8f5e3 0%, #fafcf8 55%, #fff 100%)",
          minHeight: "520px",
        }}
      >
        <FanArcs genCount={groups.length} />

        <div className="absolute bottom-3 start-1/2 -translate-x-1/2 z-20 text-center px-4">
          <div
            className="rounded-full px-5 py-2 border-2 bg-white shadow-lg"
            style={{ borderColor: accent }}
          >
            <p className="text-[10px] text-stone-500">{t("printPage.fanRoot")}</p>
            <p className="font-display text-sm font-bold" style={{ color: accent }}>
              {rootLabel}
            </p>
          </div>
        </div>

        {people.map((p) => {
          const pos = layout.get(p.id);
          if (!pos) return null;
          return (
            <div
              key={p.id}
              className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <PrintPersonCard
                person={p}
                laqabFallback={tree.tribe}
                genLevel={levels.get(p.id)}
                variant="fan"
              />
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-stone-500">{t("printPage.fanHint")}</p>
      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} today={today} />
    </div>
  );
}
