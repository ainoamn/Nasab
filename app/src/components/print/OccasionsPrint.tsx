import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Baby, Sparkles } from "lucide-react";
import PrintFamilyChart from "./PrintFamilyChart";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

type Occasion = "wedding" | "newborn" | "eid";

const OCCASION_STYLES: Record<
  Occasion,
  { icon: typeof Heart; gradient: string; border: string; emoji: string }
> = {
  wedding: {
    icon: Heart,
    gradient: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 50%, #fbcfe8 100%)",
    border: "#9d174d",
    emoji: "💍",
  },
  newborn: {
    icon: Baby,
    gradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)",
    border: "#2563eb",
    emoji: "👶",
  },
  eid: {
    icon: Sparkles,
    gradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)",
    border: "#0F5132",
    emoji: "🌙",
  },
};

export default function OccasionsPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;
  const { t } = useTranslation();
  const [occasion, setOccasion] = useState<Occasion>("wedding");

  const style = OCCASION_STYLES[occasion];
  const Icon = style.icon;

  return (
    <div>
      {/* اختيار المناسبة — لا يُطبع */}
      <div className="no-print flex justify-center gap-2 mb-6 flex-wrap">
        {(["wedding", "newborn", "eid"] as Occasion[]).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOccasion(o)}
            className={`rounded-full px-4 py-2 text-sm font-medium border-2 transition ${
              occasion === o ? "bg-primary text-primary-foreground border-primary" : "bg-card"
            }`}
          >
            {t(`printPage.occasion.${o}`)}
          </button>
        ))}
      </div>

      <div
        className="rounded-3xl border-4 border-dashed p-6 sm:p-10"
        style={{ borderColor: style.border, background: style.gradient }}
      >
        <div className="text-center mb-6">
          <span className="text-5xl">{style.emoji}</span>
          <Icon className="mx-auto mt-2 h-8 w-8" style={{ color: style.border }} />
          <p className="mt-2 font-display text-lg font-bold" style={{ color: style.border }}>
            {t(`printPage.occasion.${occasion}Title`)}
          </p>
          <p className="text-sm text-stone-600 mt-1">{t(`printPage.occasion.${occasion}Subtitle`)}</p>
        </div>

        <PrintMetaHeader
          designName={designName}
          tree={tree}
          people={people}
          rels={rels}
          levels={levels}
          today={today}
          accent={style.border}
          scopeSummary={scopeSummary}
          className="mb-6 text-center pb-4 border-b-2 border-dashed"
          titleClass="text-3xl md:text-4xl"
        />

        <div className="rounded-2xl bg-white/80 p-4 shadow-inner">
          <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
        </div>

        <p className="mt-6 text-center font-display text-sm italic text-stone-600">
          {t(`printPage.occasion.${occasion}Footer`)}
        </p>
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} today={today} />
    </div>
  );
}
