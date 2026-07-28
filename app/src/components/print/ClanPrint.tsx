import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import PrintFamilyChart from "./PrintFamilyChart";
import { buildClanHierarchy, personDisplayNameWithTwin } from "@/lib/printData";
import { twinMarkWord } from "@/lib/twins";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

const KIND_LABELS: Record<string, string> = {
  tribe: "printPage.clanTribe",
  laqab: "printPage.clanLaqab",
  clan: "printPage.clanBatn",
  family: "printPage.clanFamily",
};

function PyramidLevel({
  label,
  kindLabel,
  people,
  allPeople,
  accent,
  widthPct,
  twinWord,
}: {
  label: string;
  kindLabel: string;
  people: PrintTemplateProps["people"];
  allPeople: PrintTemplateProps["people"];
  accent: string;
  widthPct: number;
  twinWord: string;
}) {
  return (
    <div className="flex flex-col items-center w-full">
      <span className="text-[10px] uppercase tracking-widest text-amber-800/60 mb-1">{kindLabel}</span>
      <div
        className="rounded-xl border-2 py-3 px-4 text-center shadow-sm"
        style={{
          width: `${widthPct}%`,
          minWidth: "120px",
          borderColor: accent,
          background: `linear-gradient(180deg, ${accent}18, white)`,
        }}
      >
        <p className="font-display text-lg font-bold" style={{ color: accent }}>
          {label}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {people.slice(0, 12).map((p) => (
            <span
              key={p.id}
              className="text-[9px] sm:text-[10px] bg-white/80 border rounded-full px-2 py-0.5 font-display"
              style={{ borderColor: `${accent}44` }}
            >
              {personDisplayNameWithTwin(p, allPeople, twinWord)}
            </span>
          ))}
          {people.length > 12 && (
            <span className="text-[9px] text-stone-400">+{people.length - 12}</span>
          )}
        </div>
      </div>
      <ChevronDown className="my-2 h-5 w-5 text-amber-800/50" aria-hidden />
    </div>
  );
}

export default function ClanPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;
  const { t, i18n } = useTranslation();
  const twinWord = twinMarkWord(i18n.language);

  const hierarchy = useMemo(() => buildClanHierarchy(tree, people), [tree, people]);
  const widths = [45, 58, 72, 88];

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
        className="mb-8 text-center pb-4 border-b-2 border-amber-800/40"
      />

      <div className="flex flex-col items-center gap-0 mb-8 px-4">
        {hierarchy.map((level, i) => (
          <PyramidLevel
            key={`${level.kind}-${level.label}`}
            label={level.label}
            kindLabel={t(KIND_LABELS[level.kind] ?? "printPage.clanFamily")}
            people={level.people}
            allPeople={people}
            accent={accent}
            widthPct={widths[Math.min(i, widths.length - 1)] ?? 88}
            twinWord={twinWord}
          />
        ))}
        <span className="text-xs text-stone-400 -mt-2">{t("printPage.clanHint")}</span>
      </div>

      <div className="rounded-xl border-2 p-4 bg-white/80" style={{ borderColor: `${accent}55` }}>
        <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} rootPersonId={rootPersonId} today={today} />
    </div>
  );
}
