import { useTranslation } from "react-i18next";
import type { PrintTemplateId } from "./types";

export function TemplatePreviewThumb({
  id,
  accent,
  paper,
}: {
  id: PrintTemplateId;
  accent: string;
  paper: string;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="relative h-24 rounded-xl border overflow-hidden"
      style={{ backgroundColor: paper, borderColor: `${accent}55` }}
    >
      {id === "palm" && (
        <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="palmThumbTrunk" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4A3018" />
              <stop offset="50%" stopColor="#9B6530" />
              <stop offset="100%" stopColor="#4A3018" />
            </linearGradient>
          </defs>
          <path d="M40 68 L37 38 Q40 32 43 38 L40 68" fill="url(#palmThumbTrunk)" />
          {[42, 48, 54, 60].map((y) => (
            <ellipse key={y} cx="40" cy={y} rx="4" ry="1" fill="#3D2812" opacity="0.3" />
          ))}
          {[
            { tip: [40, 8], ctrl: [40, 22] },
            { tip: [18, 14], ctrl: [32, 24] },
            { tip: [62, 14], ctrl: [48, 24] },
            { tip: [8, 28], ctrl: [26, 32] },
            { tip: [72, 28], ctrl: [54, 32] },
          ].map((f, i) => (
            <g key={i} opacity={0.85}>
              <path
                d={`M40 34 Q ${f.ctrl[0]} ${f.ctrl[1]} ${f.tip[0]} ${f.tip[1]}`}
                fill="none"
                stroke="#1B6B4A"
                strokeWidth="1.2"
              />
              {[0.3, 0.5, 0.7].map((t, j) => {
                const px = 40 + (f.tip[0] - 40) * t * t + (f.ctrl[0] - 40) * 2 * t * (1 - t);
                const py = 34 + (f.tip[1] - 34) * t * t + (f.ctrl[1] - 34) * 2 * t * (1 - t);
                return (
                  <ellipse key={j} cx={px} cy={py} rx="3" ry="1.2" fill="#0F5132" opacity="0.7" />
                );
              })}
            </g>
          ))}
          <ellipse cx="40" cy="70" rx="14" ry="3" fill="#C4A574" opacity="0.5" />
        </svg>
      )}
      {id === "manuscript" && (
        <div
          className="absolute inset-0 p-2"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(184,134,11,0.25) 9px)",
          }}
        >
          <div className="flex justify-center gap-1 mt-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-7 w-7 rounded-full border-2"
                style={{
                  borderColor: "#D4AF37",
                  background: "radial-gradient(circle, #fff8dc, #B8860B)",
                }}
              />
            ))}
          </div>
        </div>
      )}
      {id === "book" && (
        <div className="absolute inset-2 flex">
          <div
            className="w-1/2 rounded-s border-2 flex flex-col items-center justify-center text-[8px] text-amber-50"
            style={{ background: accent, borderColor: accent }}
          >
            📖
          </div>
          <div className="w-1/2 border border-stone-200 bg-white p-1 space-y-1">
            <div className="h-1.5 w-full bg-stone-200 rounded" />
            <div className="h-1 w-3/4 bg-stone-100 rounded" />
          </div>
        </div>
      )}
      {id === "poster" && (
        <div className="absolute inset-0 flex items-end justify-center gap-1 pb-2 px-3">
          {[40, 65, 50, 80, 55].map((h, i) => (
            <span
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${h * 0.22}px`,
                background: ["#0F5132", "#B8860B", "#37526B", "#8B4513", "#1d4ed8"][i],
              }}
            />
          ))}
        </div>
      )}
      {id === "map" && (
        <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
          <rect width="80" height="80" fill="#b8d4e8" />
          <ellipse cx="45" cy="40" rx="22" ry="16" fill="#e8dcc8" />
          <circle cx="35" cy="38" r="3" fill={accent} />
          <circle cx="52" cy="45" r="2.5" fill={accent} />
          <circle cx="48" cy="32" r="2" fill={accent} />
        </svg>
      )}
      {id === "clan" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-[8px] font-bold" style={{ color: accent }}>
          <span className="px-3 py-0.5 border rounded" style={{ borderColor: accent }}>{t("printPage.clanTribe")}</span>
          <span>↓</span>
          <span className="px-4 py-0.5 border rounded" style={{ borderColor: accent }}>{t("printPage.clanBatn")}</span>
          <span>↓</span>
          <span className="px-5 py-0.5 border rounded" style={{ borderColor: accent }}>{t("printPage.clanFamily")}</span>
        </div>
      )}
      {id === "occasions" && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: `${accent}15` }}>
          <span className="text-3xl">💍</span>
        </div>
      )}
      {id === "ornate" && (
        <div
          className="absolute inset-2 border-4 border-double rounded-lg flex items-center justify-center"
          style={{ borderColor: accent }}
        >
          <span className="text-xl opacity-60" style={{ color: accent }}>✦</span>
        </div>
      )}
      {id === "fan" && (
        <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
          <path d="M40 72 A30 30 0 0 1 12 45" fill="none" stroke={accent} strokeWidth="1" opacity="0.4" />
          <path d="M40 72 A22 22 0 0 1 20 50" fill="none" stroke={accent} strokeWidth="1" opacity="0.5" />
          <path d="M40 72 A14 14 0 0 1 28 58" fill="none" stroke={accent} strokeWidth="1" opacity="0.6" />
          <circle cx="40" cy="72" r="4" fill={accent} />
          {[18, 28, 40, 52, 62].map((x, i) => (
            <circle key={i} cx={x} cy={55 - i * 4} r="2.5" fill={accent} opacity={0.7 + i * 0.05} />
          ))}
          <circle cx={28} cy={47} r="4.5" fill="#7c3aed" />
          <text
            x={28}
            y={48}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="5"
            fontWeight="700"
            fill="#fff"
          >
            {t("twins.mark", { order: 1 })}
          </text>
        </svg>
      )}
      {id === "sun" && (
        <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full" style={{ background: "#FDF9EF" }}>
          <circle cx="40" cy="40" r="4.5" fill="#E8F5FB" stroke="#9FD5EB" strokeWidth="1.2" />
          <circle cx="48" cy="40" r="4.5" fill="#FCE8F2" stroke="#F5B8DB" strokeWidth="1.2" />
          <line x1="44.5" y1="40" x2="43.5" y2="40" stroke="#808080" strokeWidth="0.6" />
          {[0, 40, 80, 120, 160, 200, 240, 280, 320].map((deg) => {
            const a = ((deg - 90) * Math.PI) / 180;
            return (
              <g key={deg}>
                <line
                  x1={44}
                  y1={40}
                  x2={40 + 22 * Math.cos(a)}
                  y2={40 + 22 * Math.sin(a)}
                  stroke="#808080"
                  strokeWidth="0.4"
                  opacity="0.45"
                />
                <circle
                  cx={40 + 22 * Math.cos(a)}
                  cy={40 + 22 * Math.sin(a)}
                  r="2"
                  fill="#E8F5FB"
                  stroke="#9FD5EB"
                  strokeWidth="0.7"
                />
              </g>
            );
          })}
          <circle cx="58" cy="22" r="5" fill="#7c3aed" />
          <text
            x={58}
            y={23}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="5"
            fontWeight="700"
            fill="#fff"
          >
            {t("twins.mark", { order: 1 })}
          </text>
        </svg>
      )}
      {id === "classic" && (
        <div className="absolute inset-0 flex flex-col">
          <div className="h-6 shrink-0" style={{ background: accent }} />
          <div className="flex-1 flex items-center justify-center gap-1 p-2">
            <span className="h-3 w-8 rounded border" style={{ borderColor: accent }} />
            <span className="h-2 w-4 bg-stone-300" />
            <span className="h-3 w-8 rounded border" style={{ borderColor: accent }} />
          </div>
        </div>
      )}
      {id === "pedigree" && (
        <div className="absolute inset-2 flex gap-1">
          {[3, 4, 5].map((n, i) => (
            <div key={i} className="flex-1 flex flex-col gap-0.5">
              <div className="h-2 rounded" style={{ background: accent, opacity: 0.6 + i * 0.1 }} />
              {Array.from({ length: n }).map((_, j) => (
                <div key={j} className="h-2 bg-white border rounded border-stone-200" />
              ))}
            </div>
          ))}
        </div>
      )}
      {id === "heritage" && (
        <div
          className="absolute inset-2 border-4 border-double rounded-lg flex flex-col"
          style={{ borderColor: accent }}
        >
          <div className="flex-1 m-1 border border-stone-200 rounded bg-white/80" />
          <div className="h-4 mx-1 mb-1 rounded" style={{ background: accent }} />
        </div>
      )}
    </div>
  );
}
