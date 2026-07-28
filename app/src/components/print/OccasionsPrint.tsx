import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Heart, Baby, Sparkles } from "lucide-react";
import PrintFamilyChart from "./PrintFamilyChart";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";
import { collectCloseFamily } from "@/lib/closeFamily";
import { comparePeopleByBirth, formatBirthDate } from "@/lib/birthOrder";
import { personDisplayNameWithTwin } from "@/lib/printData";
import { relationToFocus } from "@/lib/relationshipLabel";

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
  const { t, i18n } = useTranslation();
  const [occasion, setOccasion] = useState<Occasion>("wedding");

  const style = OCCASION_STYLES[occasion];
  const Icon = style.icon;
  const birthLocale = i18n.language?.startsWith("en") ? "en-GB" : "ar-OM";

  const guestList = useMemo(() => {
    if (rootPersonId == null) return [];
    const { people: close } = collectCloseFamily(rootPersonId, people, rels);
    const focus = close.find((p) => p.id === rootPersonId);
    const others = close
      .filter((p) => p.id !== rootPersonId)
      .sort(comparePeopleByBirth);
    return focus ? [focus, ...others] : others;
  }, [rootPersonId, people, rels]);

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
          rootPersonId={rootPersonId}
          today={today}
          accent={style.border}
          scopeSummary={scopeSummary}
          className="mb-6 text-center pb-4 border-b-2 border-dashed"
          titleClass="text-3xl md:text-4xl"
        />

        <div className="rounded-2xl bg-white/80 p-4 shadow-inner">
          <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
        </div>

        {guestList.length > 0 && rootPersonId != null ? (
          <div
            className="mt-6 rounded-2xl border-2 bg-white/90 p-4 print:break-inside-avoid"
            style={{ borderColor: `${style.border}55` }}
          >
            <p
              className="mb-3 text-center font-display text-sm font-bold"
              style={{ color: style.border }}
            >
              {t("printPage.occasion.guestListTitle")}
              <span className="ms-1 text-xs font-normal text-stone-500">
                ({guestList.length})
              </span>
            </p>
            <ul className="columns-1 sm:columns-2 gap-x-6 text-sm font-display">
              {guestList.map((p, i) => {
                const kinKey = relationToFocus(rootPersonId, p.id, people, rels);
                const birth = formatBirthDate(p, birthLocale);
                return (
                  <li
                    key={p.id}
                    className="mb-1.5 flex items-baseline gap-2 break-inside-avoid border-b border-stone-100 pb-1"
                  >
                    <span className="w-5 shrink-0 text-[10px] tabular-nums text-stone-400">
                      {i + 1}.
                    </span>
                    <span className="min-w-0">
                      <span className={p.id === rootPersonId ? "font-bold" : undefined}>
                        {personDisplayNameWithTwin(p, people)}
                      </span>
                      <span className="ms-1 text-[10px] font-normal text-stone-500">
                        (
                        {p.id === rootPersonId
                          ? t("printPage.occasion.guestFocus")
                          : t(`tree.rel.${kinKey}`)}
                        {birth ? ` · ${birth}` : ""})
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <p className="mt-6 text-center font-display text-sm italic text-stone-600">
          {t(`printPage.occasion.${occasion}Footer`)}
        </p>
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} rootPersonId={rootPersonId} today={today} />
    </div>
  );
}
