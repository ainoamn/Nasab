import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/schema";
import { CompanyDocumentHeader } from "@/components/CompanyDocumentHeader";
import {
  computePrintStats,
  displayGenerationNumber,
  type PrintStats,
} from "@/lib/printData";
import type { PrintTemplateProps } from "./types";

type StatsProps = {
  people: Person[];
  levels: Map<number, number>;
  rels?: Relationship[];
  rootPersonId?: number;
  today: string;
  accent: string;
};

function usePrintStats(
  people: Person[],
  levels: Map<number, number>,
  rels?: Relationship[],
  rootPersonId?: number,
): PrintStats {
  return useMemo(
    () => computePrintStats(people, levels, rels, { rootPersonId }),
    [people, levels, rels, rootPersonId],
  );
}

function generationTitle(level: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (level < 0) return t("printPage.ancestorLabel", { n: Math.abs(level) });
  return t("printPage.generationLabel", { n: displayGenerationNumber(level) });
}

export function PrintStatsBar({ people, levels, rels, rootPersonId, today, accent }: StatsProps) {
  const { t } = useTranslation();
  const stats = usePrintStats(people, levels, rels, rootPersonId);

  const items = [
    { label: t("printPage.statsGenerations"), value: stats.generationCount },
    { label: t("printPage.statsMales"), value: stats.males },
    { label: t("printPage.statsFemales"), value: stats.females },
    { label: t("printPage.statsLiving"), value: stats.living },
    { label: t("printPage.statsDeceased"), value: stats.deceased },
    { label: t("printPage.statsInLawSpouses"), value: stats.inLawSpouses },
    { label: t("printPage.statsTwins"), value: stats.twins },
    { label: t("printPage.statsTotal"), value: stats.total },
  ];

  return (
    <div
      className="print-stats-bar mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 print:gap-1.5 print:mt-1.5"
      aria-label={t("printPage.statsSummaryTitle")}
    >
      {items.map((item) => (
        <span
          key={item.label}
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-xs font-display bg-white/80 print:bg-white print:break-inside-avoid print:px-2 print:py-0.5"
          style={{ borderColor: `${accent}44` }}
        >
          <span className="text-stone-500">{item.label}</span>
          {item.value != null && (
            <span className="font-bold" style={{ color: accent }}>
              {item.value}
            </span>
          )}
        </span>
      ))}
      <span
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] sm:text-xs font-display bg-white/80 print:bg-white print:break-inside-avoid print:px-2 print:py-0.5"
        style={{ borderColor: `${accent}44` }}
      >
        <span className="text-stone-500">{t("printPage.date", { date: today })}</span>
      </span>
    </div>
  );
}

export function PrintStatsSummary({ people, levels, rels, rootPersonId, today, accent }: StatsProps) {
  const { t } = useTranslation();
  const stats = usePrintStats(people, levels, rels, rootPersonId);

  if (stats.total === 0) return null;

  return (
    <section
      className="mt-8 rounded-xl border bg-stone-50/80 p-4 print:break-inside-avoid"
      style={{ borderColor: `${accent}44` }}
      aria-label={t("printPage.statsSummaryTitle")}
    >
      <h2 className="font-display text-sm font-bold text-center mb-3" style={{ color: accent }}>
        {t("printPage.statsSummaryTitle")}
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-center text-xs font-display">
        {[
          [t("printPage.statsTotal"), stats.total],
          [t("printPage.statsGenerations"), stats.generationCount],
          [t("printPage.statsMales"), stats.males],
          [t("printPage.statsFemales"), stats.females],
          [t("printPage.statsLiving"), stats.living],
          [t("printPage.statsDeceased"), stats.deceased],
          [t("printPage.statsInLawSpouses"), stats.inLawSpouses],
          [t("printPage.statsTwins"), stats.twins],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-lg border bg-white px-2 py-2"
            style={{ borderColor: `${accent}33` }}
          >
            <p className="text-stone-500 text-[10px]">{label}</p>
            <p className="text-base font-bold" style={{ color: accent }}>
              {value}
            </p>
          </div>
        ))}
        <div
          className="rounded-lg border bg-white px-2 py-2 col-span-2 sm:col-span-2"
          style={{ borderColor: `${accent}33` }}
        >
          <p className="text-stone-500 text-[10px]">{t("printPage.date", { date: today })}</p>
          <p className="text-sm font-semibold text-stone-700">{today}</p>
        </div>
      </div>

      {stats.byGeneration.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-display border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: `${accent}44` }}>
                <th className="py-2 px-2 text-start font-bold" style={{ color: accent }}>
                  {t("printPage.statsGenColumn")}
                </th>
                <th className="py-2 px-2 text-center">{t("printPage.statsTotal")}</th>
                <th className="py-2 px-2 text-center">{t("printPage.statsMales")}</th>
                <th className="py-2 px-2 text-center">{t("printPage.statsFemales")}</th>
                <th className="py-2 px-2 text-center">{t("printPage.statsLiving")}</th>
                <th className="py-2 px-2 text-center">{t("printPage.statsDeceased")}</th>
              </tr>
            </thead>
            <tbody>
              {stats.byGeneration.map((row) => (
                <tr key={row.level} className="border-b border-stone-200/80">
                  <td className="py-1.5 px-2 font-semibold text-stone-700">
                    {generationTitle(row.level, t)}
                  </td>
                  <td className="py-1.5 px-2 text-center">{row.total}</td>
                  <td className="py-1.5 px-2 text-center">{row.males}</td>
                  <td className="py-1.5 px-2 text-center">{row.females}</td>
                  <td className="py-1.5 px-2 text-center">{row.living}</td>
                  <td className="py-1.5 px-2 text-center">{row.deceased}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function PrintMetaHeader({
  designName,
  tree,
  people,
  rels,
  levels,
  rootPersonId,
  today,
  accent,
  scopeSummary,
  className = "",
  titleClass = "text-3xl md:text-4xl",
}: {
  designName: string;
  tree: PrintTemplateProps["tree"];
  people: Person[];
  rels: Relationship[];
  levels: Map<number, number>;
  rootPersonId?: number;
  today: string;
  accent: string;
  scopeSummary?: string;
  className?: string;
  titleClass?: string;
}) {
  const { t } = useTranslation();

  return (
    <header className={className}>
      <CompanyDocumentHeader compact className="mb-3 pb-3 border-b border-stone-200" />
      <p className="text-xs font-medium tracking-wide mb-2" style={{ color: accent }}>
        {designName}
      </p>
      <h1 className={`font-display font-bold ${titleClass}`} style={{ color: accent }}>
        {t("printPage.treeOf", { name: tree.name })}
      </h1>
      <p className="font-display text-lg mt-2 text-stone-600">
        {[tree.tribe, tree.region]
          .filter(Boolean)
          .join(` ${t("common.emDash")} `)}
      </p>
      <PrintStatsBar
        people={people}
        levels={levels}
        rels={rels}
        rootPersonId={rootPersonId}
        today={today}
        accent={accent}
      />
      <p className="mt-2 text-center text-[10px] text-stone-400">{t("printPage.by")}</p>
      {scopeSummary && (
        <p className="mt-2 text-[11px] text-stone-400 text-center max-w-2xl mx-auto leading-relaxed">
          {scopeSummary}
        </p>
      )}
    </header>
  );
}

export function PrintMetaFooter({
  designName,
  accent,
  people,
  rels,
  levels,
  rootPersonId,
  today,
}: {
  designName: string;
  accent: string;
  people: Person[];
  rels: Relationship[];
  levels: Map<number, number>;
  rootPersonId?: number;
  today: string;
}) {
  const { t } = useTranslation();
  return (
    <footer>
      <PrintStatsSummary
        people={people}
        levels={levels}
        rels={rels}
        rootPersonId={rootPersonId}
        today={today}
        accent={accent}
      />
      <div
        className="mt-6 border-t pt-4 text-center text-xs text-stone-500 font-display print:break-inside-avoid"
        style={{ borderColor: `${accent}55` }}
      >
        {t("printPage.quote")}
        <p className="mt-1 opacity-70">{designName}</p>
      </div>
    </footer>
  );
}
