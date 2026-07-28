import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import PrintFamilyChart from "./PrintFamilyChart";
import {
  buildAscendantChain,
  personDisplayNameWithTwin,
} from "@/lib/printData";
import { twinMarkWord } from "@/lib/twins";
import { PrintMetaFooter, PrintStatsBar } from "./shared";
import type { PrintTemplateProps } from "./types";

function HeritageFrame({ accent, children }: { accent: string; children: ReactNode }) {
  return (
    <div className="relative p-4 sm:p-8">
      <div
        className="absolute inset-0 rounded-3xl border-[10px] border-double opacity-90"
        style={{ borderColor: accent }}
      />
      <div
        className="absolute inset-3 rounded-2xl border-2 opacity-40"
        style={{ borderColor: accent }}
      />
      {/* زوايا زخرفية */}
      {(
        [
          "top-2 start-2 border-t-4 border-s-4",
          "top-2 end-2 border-t-4 border-e-4",
          "bottom-2 start-2 border-b-4 border-s-4",
          "bottom-2 end-2 border-b-4 border-e-4",
        ] as const
      ).map((cls) => (
        <span
          key={cls}
          className={`absolute w-8 h-8 rounded-sm ${cls}`}
          style={{ borderColor: accent }}
        />
      ))}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function HeritageBoardPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;
  const { t, i18n } = useTranslation();
  const twinWord = twinMarkWord(i18n.language);

  const nasabChain = useMemo(() => {
    const root = people.find((p) => p.id === rootPersonId);
    if (!root) return tree.name;
    const chain = buildAscendantChain(root.id, people, rels, 6);
    const names = chain.map((p) => personDisplayNameWithTwin(p, people, twinWord));
    if (tree.tribe) names.push(tree.tribe);
    return names.join(t("printPage.nasabJoin"));
  }, [rootPersonId, people, rels, tree, twinWord, t]);

  return (
    <div style={{ background: "linear-gradient(180deg, #faf8f4 0%, #f5f0e8 100%)" }}>
      <HeritageFrame accent={accent}>
        <div className="text-center mb-6 pt-4">
          <p className="text-xs tracking-[0.3em] text-stone-500 uppercase mb-2">
            {designName}
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold" style={{ color: accent }}>
            {tree.name}
          </h1>
          <p className="font-display text-lg text-stone-600 mt-2">
            {[tree.tribe, tree.region].filter(Boolean).join(" — ")}
          </p>
        </div>

        {/* شريط النسب */}
        <div
          className="mx-auto max-w-3xl mb-6 rounded-2xl px-4 py-3 text-center border-2 bg-white/80"
          style={{ borderColor: `${accent}66` }}
        >
          <p className="text-[10px] text-stone-500 mb-1">{t("printPage.heritageNasab")}</p>
          <p className="font-display text-sm sm:text-base font-bold leading-relaxed" style={{ color: accent }}>
            {nasabChain}
          </p>
        </div>

        <div className="rounded-xl bg-white/90 p-3 sm:p-4 shadow-inner mb-6">
          <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
        </div>

        {/* شريط سفلي — مثل PDF سلالة الرواحي */}
        <div
          className="rounded-xl px-4 py-3 text-center text-white"
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}
        >
          <p className="font-display text-lg sm:text-xl font-bold">
            {t("printPage.heritageBanner", { name: tree.name })}
          </p>
          <div className="mt-2 bg-white/15 rounded-lg px-2 py-2">
            <PrintStatsBar people={people} levels={levels} rels={rels} rootPersonId={rootPersonId} today={today} accent="#FFFFFF" />
          </div>
          {scopeSummary && (
            <p className="text-[10px] opacity-70 mt-1 leading-relaxed">{scopeSummary}</p>
          )}
        </div>
      </HeritageFrame>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} rootPersonId={rootPersonId} today={today} />
    </div>
  );
}
