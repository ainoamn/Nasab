import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import PrintFamilyChart from "./PrintFamilyChart";
import { clusterByBirthPlace, personDisplayNameWithTwin } from "@/lib/printData";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

/** مواقع تقريبية على «خريطة» الخليج (x%, y%) */
const REGION_HINTS: Record<string, { x: number; y: number }> = {
  مسقط: { x: 62, y: 55 },
  muscat: { x: 62, y: 55 },
  صلالة: { x: 58, y: 78 },
  salalah: { x: 58, y: 78 },
  نزوى: { x: 55, y: 50 },
  nizwa: { x: 55, y: 50 },
  dubai: { x: 72, y: 42 },
  دبي: { x: 72, y: 42 },
  riyadh: { x: 48, y: 38 },
  الرياض: { x: 48, y: 38 },
  bahrain: { x: 58, y: 45 },
  البحرين: { x: 58, y: 45 },
  kuwait: { x: 52, y: 32 },
  الكويت: { x: 52, y: 32 },
  qatar: { x: 65, y: 40 },
  قطر: { x: 65, y: 40 },
};

function placePosition(place: string, index: number): { x: number; y: number } {
  const key = Object.keys(REGION_HINTS).find((k) =>
    place.toLowerCase().includes(k.toLowerCase()),
  );
  if (key) return REGION_HINTS[key]!;
  const angle = (index * 137.5 * Math.PI) / 180;
  return {
    x: 50 + Math.cos(angle) * (18 + (index % 5) * 4),
    y: 50 + Math.sin(angle) * (12 + (index % 4) * 3),
  };
}

function GulfMapSvg() {
  return (
    <svg viewBox="0 0 400 280" className="absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b8d4e8" />
          <stop offset="100%" stopColor="#7eb8d4" />
        </linearGradient>
      </defs>
      <rect width="400" height="280" fill="url(#seaGrad)" rx="8" />
      <path
        d="M180 40 L220 35 L260 50 L280 80 L290 120 L285 160 L270 200 L240 230 L200 240 L160 220 L130 180 L120 130 L130 80 L150 50 Z"
        fill="#e8dcc8"
        stroke="#37526B"
        strokeWidth="1.5"
        opacity="0.9"
      />
      <ellipse cx="240" cy="130" rx="55" ry="40" fill="#7eb8d4" opacity="0.6" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <line
          key={`h${i}`}
          x1="0"
          y1={i * 40}
          x2="400"
          y2={i * 40}
          stroke="#37526B"
          strokeWidth="0.3"
          opacity="0.2"
        />
      ))}
    </svg>
  );
}

export default function MapPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } = props;
  const { t } = useTranslation();

  const clusters = useMemo(() => clusterByBirthPlace(people), [people]);
  const unknownCount = people.filter((p) => !p.birthPlace?.trim() && !p.deathPlace?.trim()).length;

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
        className="mb-6 text-center pb-4 border-b border-slate-400"
      />

      <div className="mb-8 grid gap-6 lg:grid-cols-2 print:grid-cols-1">
        <div
          className="relative overflow-hidden rounded-xl border print:break-inside-avoid"
          style={{ borderColor: `${accent}55`, aspectRatio: "400 / 280" }}
        >
          <GulfMapSvg />
          {clusters.map((c, i) => {
            const pos = placePosition(c.place, i);
            return (
              <div
                key={c.place}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md"
                  style={{ backgroundColor: accent }}
                >
                  {c.count}
                </span>
                <span className="absolute top-full mt-0.5 start-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-display bg-white/90 px-1 rounded shadow">
                  {c.place}
                </span>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <h3 className="font-display font-bold" style={{ color: accent }}>
            {t("printPage.mapLegend")}
          </h3>

          {/* كلمات مفتاحية لمفتاح الخريطة */}
          <div
            className="rounded-lg border bg-white/90 p-3 text-xs text-stone-700 space-y-1.5"
            style={{ borderColor: `${accent}44` }}
          >
            <p className="font-display font-bold text-sm" style={{ color: accent }}>
              {t("printPage.mapKeyTitle")}
            </p>
            <p>{t("printPage.mapKeyDot")}</p>
            <p>{t("printPage.mapKeyPlace")}</p>
            <p>{t("printPage.mapKeyList")}</p>
          </div>

          {clusters.length === 0 ? (
            <p className="text-sm text-stone-500">{t("printPage.mapEmpty")}</p>
          ) : (
            clusters.map((c) => (
              <div
                key={c.place}
                className="rounded-lg border bg-white/80 p-3"
                style={{ borderColor: `${accent}33` }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-display font-bold text-sm">{c.place}</span>
                  <span className="text-xs text-stone-500">{c.count}</span>
                </div>
                <p className="text-xs text-stone-600 line-clamp-2">
                  {c.people.map((p) => personDisplayNameWithTwin(p, people)).join(" · ")}
                </p>
              </div>
            ))
          )}
          {unknownCount > 0 && (
            <p className="text-xs text-stone-400">{t("printPage.mapUnknown", { count: unknownCount })}</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-3 bg-white/70" style={{ borderColor: accent }}>
        <PrintFamilyChart people={people} rels={rels} rootPersonId={rootPersonId} levels={levels} />
      </div>

      <PrintMetaFooter designName={designName} accent={accent} people={people} rels={rels} levels={levels} rootPersonId={rootPersonId} today={today} />
    </div>
  );
}
