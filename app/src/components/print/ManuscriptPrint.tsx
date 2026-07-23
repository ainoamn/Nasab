import { useMemo } from "react";
import PrintFamilyChart from "./PrintFamilyChart";
import { buildAscendantChain, personDisplayName } from "@/lib/printData";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

function GoldMedallion({ name, sub }: { name: string; sub?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full border-4 text-center shadow-inner"
        style={{
          borderColor: "#D4AF37",
          background: "radial-gradient(circle at 30% 30%, #fff8dc, #B8860B 70%, #8B6914)",
          boxShadow: "inset 0 2px 8px rgba(255,255,255,0.4), 0 2px 6px rgba(0,0,0,0.15)",
        }}
      >
        <span className="font-display text-[9px] sm:text-[10px] font-bold text-amber-950 leading-tight px-1 line-clamp-3">
          {name}
        </span>
      </div>
      {sub && <span className="text-[9px] text-amber-800/70 font-display">{sub}</span>}
    </div>
  );
}

export default function ManuscriptPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;

  const elders = useMemo(() => {
    const chain = buildAscendantChain(rootPersonId, people, rels, 8);
    if (chain.length > 0) return chain;
    const sorted = [...people].sort(
      (a, b) => (levels.get(a.id) ?? 0) - (levels.get(b.id) ?? 0),
    );
    return sorted.slice(0, 8);
  }, [people, rels, levels, rootPersonId]);

  return (
    <div
      className="relative"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(184,134,11,0.12) 32px)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-4 border-4 border-double rounded-lg opacity-40"
        style={{ borderColor: accent }}
      />
      <div
        className="pointer-events-none absolute inset-8 border border-dashed rounded opacity-25"
        style={{ borderColor: accent }}
      />

      <PrintMetaHeader
        designName={designName}
        tree={tree}
        people={people}
        rels={rels}
        levels={levels}
        today={today}
        accent={accent}
        scopeSummary={scopeSummary}
        className="relative z-10 mb-8 text-center pb-6 border-b-4 border-double"
        titleClass="text-4xl md:text-5xl"
      />

      <div className="relative z-10 mb-8">
        <p
          className="text-center font-display text-sm mb-4 tracking-widest"
          style={{ color: accent }}
        >
          ✦ بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ ✦
        </p>
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
          {elders.map((p) => (
            <GoldMedallion
              key={p.id}
              name={personDisplayName(p)}
              sub={p.laqab ?? p.clan}
            />
          ))}
        </div>
      </div>

      <div
        className="relative z-10 rounded-xl border-2 p-4 sm:p-6 bg-[#fffef8]/90"
        style={{ borderColor: `${accent}88` }}
      >
        <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} today={today} />
    </div>
  );
}
