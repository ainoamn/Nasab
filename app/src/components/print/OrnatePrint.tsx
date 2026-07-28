import PrintFamilyChart from "./PrintFamilyChart";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

function IslamicBorder({ accent }: { accent: string }) {
  return (
    <>
      <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-30" aria-hidden>
        <defs>
          <pattern id="islamicPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M20 0 L25 15 L40 20 L25 25 L20 40 L15 25 L0 20 L15 15 Z"
              fill="none"
              stroke={accent}
              strokeWidth="0.8"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#islamicPattern)" />
      </svg>
      <div
        className="pointer-events-none absolute inset-3 border-[6px] border-double rounded-2xl"
        style={{ borderColor: accent }}
      />
      <div
        className="pointer-events-none absolute inset-6 border border-dotted rounded-xl opacity-50"
        style={{ borderColor: accent }}
      />
      {/* زوايا */}
      {(["top-4 start-4", "top-4 end-4", "bottom-4 start-4", "bottom-4 end-4"] as const).map((pos) => (
        <span
          key={pos}
          className={`pointer-events-none absolute ${pos} text-2xl opacity-60`}
          style={{ color: accent }}
          aria-hidden
        >
          ✦
        </span>
      ))}
    </>
  );
}

export default function OrnatePrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;

  return (
    <div className="relative min-h-[600px]">
      <IslamicBorder accent={accent} />

      <div className="relative z-10 p-6 sm:p-10">
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
          className="mb-8 text-center pb-6 border-[6px] border-double rounded-3xl p-6"
          titleClass="text-4xl md:text-5xl"
        />

        <div
          className="rounded-2xl p-4 border-4 border-double bg-white/85"
          style={{ borderColor: accent }}
        >
          <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
        </div>
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} rootPersonId={rootPersonId} today={today} />
    </div>
  );
}
