import type { PalmFrondBranch } from "@/lib/printData";
import { formatPalmCouple, personDisplayNameWithTwin } from "@/lib/printData";
import { twinMarkLabel } from "@/lib/twins";
import type { Person } from "@db/schema";
import {
  PALM_CROWN,
  PALM_FROND_ARCS,
  couplePosition,
  frondPath,
  frondPinnaePaths,
  leafletOffset,
  leafletPositions,
  tipPosition,
  type PalmFrondArc,
} from "./palmGeometry";

type Props = {
  founder: Person | null;
  fronds: PalmFrondBranch[];
  people: Person[];
  twinWord?: string;
  trunkLabel: string;
  coupleLabel: string;
  leafLabel: string;
  accent: string;
  overflowFronds: number;
  overflowNote: string;
};

function palmPersonLabel(person: Person, people: Person[], twinWord = "ت"): string {
  const mark = twinMarkLabel(person, people, twinWord);
  return mark ? `${person.givenName} · ${mark}` : person.givenName;
}

function SvgNameBadge({
  x,
  y,
  text,
  variant,
  maxWidth = 140,
  accent,
}: {
  x: number;
  y: number;
  text: string;
  variant: "trunk" | "couple" | "leaf" | "tip";
  maxWidth?: number;
  accent: string;
}) {
  const cfg = {
    trunk: { w: 168, h: 48, fs: 16, bg: "#5C3D1E", fg: "#FAF6EB", stroke: "#C4A574", rx: 10 },
    couple: { w: maxWidth, h: 34, fs: 11, bg: "#0F5132", fg: "#FFFFFF", stroke: "#1B6B4A", rx: 17 },
    leaf: { w: 92, h: 26, fs: 10, bg: "#FFFFFF", fg: "#0F5132", stroke: accent, rx: 13 },
    tip: { w: 72, h: 22, fs: 9, bg: "#166534", fg: "#ECFDF5", stroke: "#14532D", rx: 11 },
  }[variant];
  const { w, h, fs, bg, fg, stroke, rx } = cfg;

  return (
    <g transform={`translate(${x - w / 2}, ${y - h / 2})`}>
      <rect
        width={w}
        height={h}
        rx={rx}
        fill={bg}
        stroke={stroke}
        strokeWidth={variant === "trunk" ? 2.5 : 1.5}
        filter="url(#labelShadow)"
      />
      <text
        x={w / 2}
        y={h / 2 + fs * 0.35}
        textAnchor="middle"
        fill={fg}
        fontSize={fs}
        fontWeight={variant === "trunk" ? 700 : 600}
        fontFamily="'Noto Naskh Arabic', 'Traditional Arabic', serif"
        direction="rtl"
      >
        {text.length > 22 ? `${text.slice(0, 20)}…` : text}
      </text>
    </g>
  );
}

function RealisticFrond({ arc, index }: { arc: PalmFrondArc; index: number }) {
  const pinnae = frondPinnaePaths(arc, PALM_CROWN, 16 + (index % 2));
  const depth = 0.78 + (index % 3) * 0.06;

  return (
    <g opacity={depth}>
      {pinnae.map((d, i) => (
        <path
          key={i}
          d={d}
          fill={i % 2 === 0 ? "url(#pinnaGradA)" : "url(#pinnaGradB)"}
          stroke="#0B4D32"
          strokeWidth={0.35}
        />
      ))}
      <path
        d={frondPath(arc)}
        fill="none"
        stroke="#1B6B4A"
        strokeWidth={3.5}
        strokeLinecap="round"
        opacity={0.55}
      />
      <path
        d={frondPath(arc)}
        fill="none"
        stroke="#0F5132"
        strokeWidth={1.2}
        strokeLinecap="round"
        opacity={0.35}
      />
    </g>
  );
}

export default function OmaniPalmChart({
  founder,
  fronds,
  people,
  twinWord = "ت",
  trunkLabel,
  coupleLabel,
  leafLabel,
  accent,
  overflowFronds,
  overflowNote,
}: Props) {
  return (
    <svg
      viewBox="0 0 1200 820"
      className="w-full h-auto mx-auto block print-palm-svg"
      role="img"
      aria-label="شجرة النسب على نخلة عمانية"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D6EBF5" />
          <stop offset="40%" stopColor="#EDF7F0" />
          <stop offset="100%" stopColor="#E8DCC8" />
        </linearGradient>
        <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A3018" />
          <stop offset="35%" stopColor="#9B6530" />
          <stop offset="65%" stopColor="#B8864A" />
          <stop offset="100%" stopColor="#4A3018" />
        </linearGradient>
        <linearGradient id="pinnaGradA" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#0A3D28" />
          <stop offset="100%" stopColor="#1E8A58" />
        </linearGradient>
        <linearGradient id="pinnaGradB" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#0F5132" />
          <stop offset="100%" stopColor="#2DA56E" />
        </linearGradient>
        <radialGradient id="groundGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#D4C4A8" />
          <stop offset="100%" stopColor="#A89070" stopOpacity={0.4} />
        </radialGradient>
        <filter id="labelShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.18" />
        </filter>
        <pattern id="omanBorder" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M20 0 L24 8 L20 16 L16 8 Z" fill={accent} opacity={0.25} />
          <circle cx="20" cy="20" r="3" fill={accent} opacity={0.15} />
        </pattern>
      </defs>

      {/* إطار المجلس العماني */}
      <rect x="12" y="12" width="1176" height="796" rx="28" fill="url(#skyGrad)" stroke={accent} strokeWidth="5" />
      <rect x="24" y="24" width="1152" height="772" rx="20" fill="url(#omanBorder)" opacity={0.35} />
      <rect x="32" y="32" width="1136" height="756" rx="16" fill="none" stroke={accent} strokeWidth="1.5" opacity={0.4} />

      {/* زخارف الزوايا */}
      {[
        [48, 48],
        [1152, 48],
        [48, 772],
        [1152, 772],
      ].map(([cx, cy], i) => (
        <g key={i} transform={`translate(${cx}, ${cy})`}>
          <circle r="18" fill="none" stroke={accent} strokeWidth="1.5" opacity={0.5} />
          <circle r="8" fill={accent} opacity={0.2} />
        </g>
      ))}

      <ellipse cx="600" cy="758" rx="340" ry="32" fill="url(#groundGrad)" opacity={0.75} />

      {/* جذور */}
      <g fill="none" stroke="#5C3D1E" strokeWidth="5" strokeLinecap="round" opacity={0.6}>
        <path d="M555 722 Q460 790 350 768" />
        <path d="M575 728 Q520 800 465 778" />
        <path d="M600 730 L600 808" />
        <path d="M625 728 Q680 800 735 778" />
        <path d="M645 722 Q740 790 850 768" />
      </g>

      {/* سعف — طبقات عمق */}
      <g>
        {[4, 5, 6, 3, 2, 1, 0].map((idx) => {
          const arc = PALM_FROND_ARCS[idx]!;
          return <RealisticFrond key={arc.id} arc={arc} index={idx} />;
        })}
      </g>

      {/* جذع بعرض واقعي مع حلقات */}
      <path
        d="M552 722 L542 518 Q600 482 658 518 L648 722 Z"
        fill="url(#trunkGrad)"
        stroke="#4A3018"
        strokeWidth="1.5"
      />
      {[530, 565, 600, 635, 670, 705].map((y, i) => (
        <g key={y}>
          <ellipse cx="600" cy={y} rx={30 - i * 0.5} ry="6" fill="#4A3018" opacity={0.22} />
          <path
            d={`M572 ${y} Q600 ${y - 4} 628 ${y}`}
            fill="none"
            stroke="#3D2812"
            strokeWidth="1"
            opacity={0.35}
          />
        </g>
      ))}

      <ellipse cx="600" cy="502" rx="48" ry="16" fill="#1B6B4A" opacity={0.45} />

      {/* أسماء على السعف */}
      {fronds.slice(0, PALM_FROND_ARCS.length).map((frond, i) => {
        const arc = PALM_FROND_ARCS[i]!;
        const couplePt = couplePosition(arc);
        const leafPts = leafletPositions(arc, Math.min(frond.children.length, 5));
        const extra = frond.children.length - leafPts.length;

        return (
          <g key={arc.id}>
            <SvgNameBadge
              x={couplePt.x}
              y={couplePt.y}
              text={formatPalmCouple(frond.father, frond.mother, people, twinWord)}
              variant="couple"
              maxWidth={150}
              accent={accent}
            />

            {frond.children.slice(0, leafPts.length).map((child, ci) => {
              const pt = leafPts[ci]!;
              const off = leafletOffset(arc, ci);
              return (
                <SvgNameBadge
                  key={child.id}
                  x={pt.x + off.dx}
                  y={pt.y + off.dy}
                  text={palmPersonLabel(child, people, twinWord)}
                  variant="leaf"
                  accent={accent}
                />
              );
            })}

            {extra > 0 && (
              <SvgNameBadge
                x={tipPosition(arc).x}
                y={tipPosition(arc).y - 8}
                text={`+${extra}`}
                variant="tip"
                accent={accent}
              />
            )}

            {frond.grandchildren.slice(0, 2).map((gc, gi) => {
              const pt = tipPosition(arc);
              return (
                <SvgNameBadge
                  key={gc.id}
                  x={pt.x + (gi === 0 ? -28 : 28)}
                  y={pt.y - 28 - gi * 10}
                  text={palmPersonLabel(gc, people, twinWord)}
                  variant="tip"
                  accent={accent}
                />
              );
            })}
          </g>
        );
      })}

      {/* لوحة الجذع — المؤسس */}
      <g>
        <rect x="508" y="582" width="184" height="56" rx="12" fill="#5C3D1E" stroke="#C4A574" strokeWidth="2.5" filter="url(#labelShadow)" />
        <text x="600" y="602" textAnchor="middle" fill="#C4A574" fontSize="10" fontFamily="'Noto Naskh Arabic', serif">
          {trunkLabel}
        </text>
        {founder && (
          <text
            x="600"
            y="628"
            textAnchor="middle"
            fill="#FAF6EB"
            fontSize="19"
            fontWeight="bold"
            fontFamily="'Noto Naskh Arabic', serif"
            direction="rtl"
          >
            {personDisplayNameWithTwin(founder, people, twinWord)}
          </text>
        )}
      </g>

      {/* مفتاح */}
      <g fontFamily="'Noto Naskh Arabic', serif" fontSize="11" fill="#5C4D3C">
        <rect x="36" y="738" width="360" height="54" rx="10" fill="white" fillOpacity={0.9} stroke={accent} strokeOpacity={0.35} />
        <text x="52" y="762" fontWeight="bold" fill={accent}>
          ● {trunkLabel}
        </text>
        <text x="52" y="780">● {coupleLabel}</text>
        <text x="210" y="780">● {leafLabel}</text>
        {overflowFronds > 0 && (
          <text x="420" y="768" fill="#78716C" fontSize="10">
            {overflowNote}
          </text>
        )}
      </g>
    </svg>
  );
}
