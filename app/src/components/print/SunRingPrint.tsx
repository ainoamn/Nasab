import { useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Person } from "@db/schema";
import {
  computeSunLayout,
  formatPrintChartName,
  isPersonLiving,
  type SunPosition,
} from "@/lib/printData";
import { twinGroupSize, twinOrderInGroup } from "@/lib/twins";
import { buildSpousesOf } from "@/lib/familyGraph";
import type { PrintNameMode } from "@/lib/printFilter";
import { applyNameMode } from "@/lib/printFilter";
import { PrintStatsBar } from "./shared";
import type { PrintTemplateProps } from "./types";

/** ألوان هادئة لمخطط نسب عائلي مطبوع */
const BG = "#FBF7EF";
const RING_GUIDE = "#E8DFD0";
const LINE_BLOOD = "#5C6570";
const LINE_SPOUSE = "#C4A574";
const MALE_BORDER = "#5FA8C9";
const FEMALE_BORDER = "#D489A8";
const MALE_FILL = "#EAF5FA";
const FEMALE_FILL = "#FCECF4";
/** إطار مخطط أسود للمتوفى */
const DECEASED_BORDER = "#111111";
const DECEASED_DASH = "6 4";
/** إطار ذهبي للمتزوج */
const MARRIED_BORDER = "#C9A227";
const TEXT = "#1c1917";
const MUTED = "#78716c";
const ACCENT = "#8B6914";
const BORDER_ORNAMENT = "#D4C4A8";

const VB = 3000;
const CX = 1500;
const CY = 1500;

/** خط عربي واضح للطباعة/PDF */
const PRINT_FONT = "Tahoma, 'Segoe UI', 'Noto Naskh Arabic', Arial, sans-serif";

function pct(n: number) {
  return (n / 100) * VB;
}

/** اختصار لطيف عند ضيق المساحة — دون إسقاط النسب في وضع الاسم الكامل */
function fitLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(1, maxChars - 1))}…`;
}

function yearLabel(p: Person): string | null {
  if (p.birthYear && p.deathYear) return `${p.birthYear}–${p.deathYear}`;
  if (p.birthYear) return `${p.birthYear}`;
  if (p.deathYear) return `†${p.deathYear}`;
  return null;
}

function nodeRadius(ring: number, totalRings: number, isSpouse?: boolean): number {
  const base =
    ring === 0
      ? 64
      : totalRings <= 3
        ? ring === 1
          ? 40
          : 32
        : ring === 1
          ? 38
          : ring === 2
            ? 30
            : 22;
  return isSpouse ? Math.max(16, base * 0.72) : base;
}

function Silhouette({ female, size }: { female: boolean; size: number }) {
  const s = size;
  return (
    <g fill={female ? "#D4A0B8" : "#7BA8C4"} opacity={0.85}>
      <circle cx={0} cy={-s * 0.18} r={s * 0.28} />
      <path
        d={`M ${-s * 0.42} ${s * 0.48}
            C ${-s * 0.42} ${s * 0.08}, ${-s * 0.22} ${-s * 0.02}, 0 ${-s * 0.02}
            C ${s * 0.22} ${-s * 0.02}, ${s * 0.42} ${s * 0.08}, ${s * 0.42} ${s * 0.48}
            Z`}
      />
    </g>
  );
}

/**
 * اسم خارج دائرة الشخص — أفقي موحّد الاتجاه (يمين→يسار للعربية)
 * حتى لا ينعكس بعض الأسماء يميناً وبعضها يساراً مع دوران الشعاع.
 */
function NearCircleLabel({
  x2,
  y2,
  text,
  fontSize,
  endRadius,
  fill = TEXT,
  gap = 10,
}: {
  x1?: number;
  y1?: number;
  x2: number;
  y2: number;
  text: string;
  fontSize: number;
  endRadius: number;
  fill?: string;
  gap?: number;
  sideOffset?: number;
}) {
  const vx = x2 - CX;
  const vy = y2 - CY;
  const len = Math.hypot(vx, vy) || 1;
  const ox = vx / len;
  const oy = vy / len;

  // مساحة أفقية للنص — نبعد أكثر على الجانبين حتى لا يدخل في الدائرة
  const halfW = Math.min(text.length * fontSize * 0.42, 160);
  const clearance =
    endRadius + gap + halfW * Math.abs(ox) + fontSize * 0.45 * Math.abs(oy);
  const lx = x2 + ox * clearance;
  const ly = y2 + oy * clearance;

  return (
    <text
      x={lx}
      y={ly}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={fontSize}
      fontWeight={700}
      fill={fill}
      fontFamily={PRINT_FONT}
      style={{
        letterSpacing: "0.01em",
        paintOrder: "stroke",
        stroke: BG,
        strokeWidth: 3.5,
        direction: "rtl",
        unicodeBidi: "plaintext",
      }}
    >
      {text}
    </text>
  );
}

function PersonNode({
  person,
  pos,
  totalRings,
  twinOrder,
  twinTotal,
  married,
  showCenterLabel,
  centerLabel,
  spouseCaption,
  centerLabelAbove,
}: {
  person: Person;
  pos: SunPosition;
  totalRings: number;
  twinOrder?: number | null;
  twinTotal?: number | null;
  married?: boolean;
  showCenterLabel?: boolean;
  centerLabel?: string | null;
  /** تسمية زوج/زوجة تحت أيقونة الجذر */
  spouseCaption?: string | null;
  /** اسم الجذر فوق الدائرة لإفساح مكان للزوجات أسفل */
  centerLabelAbove?: boolean;
}) {
  const { t } = useTranslation();
  const x = pct(pos.x);
  const y = pct(pos.y);
  const female = person.gender === "female";
  const isSpouse = !!pos.isSpouse;
  const deceased = !isPersonLiving(person);
  const r = nodeRadius(pos.ring, totalRings, isSpouse);
  const border = female ? FEMALE_BORDER : MALE_BORDER;
  const fill = female ? FEMALE_FILL : MALE_FILL;
  const isTwin =
    !!twinOrder && twinTotal != null && twinTotal >= 2 && !isSpouse;
  const stroke = deceased
    ? DECEASED_BORDER
    : married
      ? MARRIED_BORDER
      : isTwin
        ? "#7c3aed"
        : pos.crossBranchSpouse
          ? "#B8956A"
          : border;
  const strokeWidth = deceased
    ? pos.ring === 0 && !isSpouse
      ? 3.8
      : 2.8
    : married
      ? pos.ring === 0 && !isSpouse
        ? 3.6
        : 2.9
      : isTwin
        ? 3.4
        : pos.ring === 0 && !isSpouse
          ? 3.5
          : isSpouse
            ? 2.2
            : pos.crossBranchSpouse
              ? 2.6
              : 2.3;
  const strokeDasharray = deceased
    ? DECEASED_DASH
    : isSpouse
      ? "4 3"
      : undefined;
  const photo = person.photoUrl;
  const years = showCenterLabel ? yearLabel(person) : null;
  const centerName = showCenterLabel ? centerLabel : null;

  return (
    <g transform={`translate(${x}, ${y})`} opacity={isSpouse ? 0.96 : 1}>
      {photo ? (
        <>
          <defs>
            <clipPath id={`mh-clip-${person.id}`}>
              <circle cx={0} cy={0} r={r} />
            </clipPath>
          </defs>
          <circle
            cx={0}
            cy={0}
            r={r + (pos.ring === 0 && !isSpouse ? 3 : 1.4)}
            fill="#fff"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
          <image
            href={photo}
            x={-r}
            y={-r}
            width={r * 2}
            height={r * 2}
            clipPath={`url(#mh-clip-${person.id})`}
            preserveAspectRatio="xMidYMid slice"
          />
        </>
      ) : (
        <>
          <circle
            cx={0}
            cy={0}
            r={r}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
          />
          <Silhouette female={female} size={r} />
        </>
      )}

      {twinOrder != null && twinTotal != null && twinTotal >= 2 && !isSpouse && (
        <g transform={`translate(${r * 0.55}, ${-r * 0.75})`}>
          <circle cx={0} cy={0} r={11} fill="#7c3aed" stroke="#fff" strokeWidth={1.5} />
          <text
            y={1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fontWeight={700}
            fill="#fff"
            fontFamily="Tahoma, sans-serif"
          >
            {t("twins.mark", { order: twinOrder })}
          </text>
        </g>
      )}

      {centerName && (
        <>
          <text
            y={centerLabelAbove ? -(r + (years ? 36 : 18)) : r + (years ? 20 : 18)}
            textAnchor="middle"
            dominantBaseline={centerLabelAbove ? "auto" : "hanging"}
            fontSize={20}
            fontWeight={700}
            fill={TEXT}
            fontFamily={PRINT_FONT}
          >
            {fitLabel(centerName, 52)}
          </text>
          {years && (
            <text
              y={centerLabelAbove ? -(r + 16) : r + 20 + 22}
              textAnchor="middle"
              dominantBaseline={centerLabelAbove ? "auto" : "hanging"}
              fontSize={13}
              fill={MUTED}
              fontFamily={PRINT_FONT}
            >
              {years}
            </text>
          )}
        </>
      )}

      {spouseCaption && (
        <text
          y={r + 16}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={15}
          fontWeight={700}
          fill="#8B6914"
          fontFamily={PRINT_FONT}
          style={{ paintOrder: "stroke", stroke: BG, strokeWidth: 3.5 }}
        >
          {spouseCaption}
        </text>
      )}
    </g>
  );
}

/** مفتاح الخريطة — اتجاه LTR ثابت حتى لا ينزلق النص العربي خارج الإطار */
function ChartLegend({
  x,
  y,
  t,
}: {
  x: number;
  y: number;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const rows: Array<{
    key: string;
    draw: (ox: number, oy: number) => ReactNode;
  }> = [
    {
      key: "printPage.sunKeyMale",
      draw: (ox, oy) => (
        <circle cx={ox} cy={oy} r={10} fill={MALE_FILL} stroke={MALE_BORDER} strokeWidth={2.4} />
      ),
    },
    {
      key: "printPage.sunKeyFemale",
      draw: (ox, oy) => (
        <circle cx={ox} cy={oy} r={10} fill={FEMALE_FILL} stroke={FEMALE_BORDER} strokeWidth={2.4} />
      ),
    },
    {
      key: "printPage.sunKeyDeceased",
      draw: (ox, oy) => (
        <circle
          cx={ox}
          cy={oy}
          r={10}
          fill="#F5F5F4"
          stroke={DECEASED_BORDER}
          strokeWidth={2.6}
          strokeDasharray={DECEASED_DASH}
        />
      ),
    },
    {
      key: "printPage.sunKeyMarried",
      draw: (ox, oy) => (
        <circle
          cx={ox}
          cy={oy}
          r={10}
          fill="#FFFBEB"
          stroke={MARRIED_BORDER}
          strokeWidth={2.8}
        />
      ),
    },
    {
      key: "printPage.sunKeyBlood",
      draw: (ox, oy) => (
        <line x1={ox - 11} y1={oy} x2={ox + 11} y2={oy} stroke={LINE_BLOOD} strokeWidth={2.6} />
      ),
    },
    {
      key: "printPage.sunKeySpouse",
      draw: (ox, oy) => (
        <line
          x1={ox - 11}
          y1={oy}
          x2={ox + 11}
          y2={oy}
          stroke={LINE_SPOUSE}
          strokeWidth={2.6}
          strokeDasharray="5 4"
        />
      ),
    },
    {
      key: "printPage.sunKeyTwin",
      draw: (ox, oy) => (
        <>
          <circle cx={ox} cy={oy} r={10} fill="#7c3aed" />
          <text
            x={ox}
            y={oy + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fontWeight={700}
            fill="#fff"
            fontFamily="Tahoma, sans-serif"
            style={{ direction: "ltr", unicodeBidi: "isolate" }}
          >
            {t("twins.mark", { order: 1 })}
          </text>
        </>
      ),
    },
    {
      key: "printPage.sunKeyRing",
      draw: (ox, oy) => (
        <circle cx={ox} cy={oy} r={10} fill="none" stroke={RING_GUIDE} strokeWidth={2.4} />
      ),
    },
  ];

  const boxW = 440;
  const rowH = 36;
  const padTop = 48;
  const padBottom = 18;
  const boxH = padTop + rows.length * rowH + padBottom;
  const iconX = 34;
  const textX = 60;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="sun-chart-legend"
      style={{ direction: "ltr" }}
    >
      <rect
        width={boxW}
        height={boxH}
        rx={16}
        fill="#FFFEFA"
        stroke={BORDER_ORNAMENT}
        strokeWidth={2}
        opacity={0.97}
      />
      <text
        x={boxW / 2}
        y={28}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={17}
        fontWeight={700}
        fill={ACCENT}
        fontFamily={PRINT_FONT}
        style={{ direction: "rtl", unicodeBidi: "plaintext" }}
      >
        {t("printPage.sunKeyTitle")}
      </text>
      {rows.map((row, i) => {
        const oy = padTop + i * rowH + rowH / 2;
        return (
          <g key={row.key} style={{ direction: "ltr" }}>
            {row.draw(iconX, oy)}
            <text
              x={textX}
              y={oy}
              textAnchor="start"
              dominantBaseline="middle"
              fontSize={16}
              fill={TEXT}
              fontFamily={PRINT_FONT}
              style={{ direction: "ltr", unicodeBidi: "isolate" }}
            >
              {t(row.key)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default function SunRingPrint(props: PrintTemplateProps) {
  const { tree, people: rawPeople, rels, levels, rootPersonId, today, designName } = props;
  const nameMode: PrintNameMode = props.nameMode === "firstOnly" ? "firstOnly" : "full";
  const { t } = useTranslation();
  const spouseRole = (gender: Person["gender"]) =>
    gender === "female"
      ? t("printPage.spouseWife")
      : t("printPage.spouseHusband");

  // ضمان تطبيق أسلوب الاسم حتى لو تسرّب نسب من المصدر
  const people = useMemo(
    () => applyNameMode(rawPeople, nameMode),
    [rawPeople, nameMode],
  );

  const chartName = (p: Person) =>
    nameMode === "firstOnly"
      ? formatPrintChartName(p, "firstOnly")
      : formatPrintChartName(p, "full", tree.tribe);

  const labelMaxForRing = (ring: number, mode: PrintNameMode) => {
    if (mode === "firstOnly") return 16;
    if (ring <= 1) return 42;
    if (ring === 2) return 32;
    return 22;
  };

  const layout = useMemo(
    () => computeSunLayout(people, rels, levels, rootPersonId),
    [people, rels, levels, rootPersonId],
  );

  const { positions, edges, spouseEdges, ringCount, rootIds } = layout;
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const marriedIds = useMemo(() => {
    const set = new Set<number>();
    const spousesOf = buildSpousesOf(rels);
    for (const p of people) {
      const spouses = spousesOf.get(p.id) ?? [];
      if (spouses.some((sid) => byId.has(sid))) set.add(p.id);
    }
    for (const e of spouseEdges) {
      set.add(e.fromId);
      set.add(e.toId);
    }
    return set;
  }, [people, rels, byId, spouseEdges]);

  const titleNames = useMemo(() => {
    const roots = rootIds
      .map((id) => people.find((p) => p.id === id))
      .filter(Boolean) as Person[];
    if (roots.length === 0) return tree.name;
    return roots
      .map((p) =>
        nameMode === "firstOnly"
          ? formatPrintChartName(p, "firstOnly")
          : formatPrintChartName(p, "full", tree.tribe),
      )
      .join(" و ");
  }, [rootIds, people, tree.name, tree.tribe, nameMode]);

  const titleText = t("printPage.sunTitle", { names: titleNames });
  const docTitle = t("printPage.sunFamilyDocTitle");
  const docSubtitle = t("printPage.sunFamilyDocSubtitle", {
    name: tree.name,
    tribe: tree.tribe?.trim() || t("printPage.sunFamilyTribeFallback"),
  });

  const bentPath = (x1: number, y1: number, x2: number, y2: number): string => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = mx - CX;
    const dy = my - CY;
    const len = Math.hypot(dx, dy) || 1;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const bulge = Math.min(24, dist * 0.08);
    return `M ${x1} ${y1} Q ${mx + (dx / len) * bulge} ${my + (dy / len) * bulge} ${x2} ${y2}`;
  };

  const guideRadii = useMemo(() => {
    const maxRing = Math.max(1, ringCount - 1);
    const outer = 47.5;
    const step = outer / maxRing;
    return Array.from({ length: maxRing }, (_, i) => pct((i + 1) * step));
  }, [ringCount]);

  return (
    <div className="sun-mh-print sun-family-doc w-full" style={{ background: BG }}>
      {/* شريط وثيقة عائلية — اسم السلالة خارج المخطط */}
      <header className="sun-family-doc-header mb-3 px-2 text-center print:mb-2">
        <p
          className="text-[11px] font-semibold tracking-wide print:text-[10pt]"
          style={{ color: ACCENT }}
        >
          {docTitle}
        </p>
        <h1
          className="mt-0.5 font-display text-lg font-bold text-stone-900 print:text-[14pt] sm:text-xl"
        >
          {docSubtitle}
        </h1>
        <p
          className="sun-lineage-title mx-auto mt-1.5 max-w-[52rem] text-base font-bold leading-snug text-stone-800 print:text-[12pt] sm:text-lg"
        >
          {titleText}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-stone-600 print:text-[8pt]">
          {nameMode === "firstOnly"
            ? t("printPage.nameModeFirstOnly")
            : t("printPage.nameModeFull")}
        </p>
        <PrintStatsBar
          people={people}
          levels={levels}
          rels={rels}
          rootPersonId={rootPersonId}
          today={today}
          accent={ACCENT}
        />
        <p className="mt-1 text-[10px] text-stone-500 print:text-[8pt]">
          {designName ? `${designName} · ` : ""}
          {t("printPage.by")}
        </p>
      </header>

      <div
        className="sun-family-frame relative mx-auto w-full print:max-w-none"
        style={{
          background: BG,
          maxWidth: "100%",
          aspectRatio: "1 / 1",
          boxShadow: "inset 0 0 0 2px #E8DFD0, inset 0 0 0 6px #FBF7EF, inset 0 0 0 7px #D4C4A8",
        }}
      >
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="print-sun-svg h-auto w-full"
          role="img"
          aria-label={titleText}
          style={{ background: BG }}
          shapeRendering="geometricPrecision"
          textRendering="geometricPrecision"
        >
          <rect width={VB} height={VB} fill={BG} />

          {/* زخرفة ركنية خفيفة */}
          <rect
            x={28}
            y={28}
            width={VB - 56}
            height={VB - 56}
            fill="none"
            stroke={BORDER_ORNAMENT}
            strokeWidth={1.2}
            rx={18}
            opacity={0.55}
          />

          {guideRadii.map((r) => (
            <circle
              key={`guide-${r}`}
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke={RING_GUIDE}
              strokeWidth={1.15}
              opacity={0.9}
            />
          ))}

          {edges.map((e) => {
            const from = positions.get(e.fromId);
            const to = positions.get(e.toId);
            if (!from || !to) return null;
            return (
              <path
                key={`ch-${e.fromId}-${e.toId}`}
                d={bentPath(pct(from.x), pct(from.y), pct(to.x), pct(to.y))}
                stroke={LINE_BLOOD}
                strokeWidth={1.65}
                fill="none"
                opacity={0.62}
              />
            );
          })}

          {spouseEdges.map((e) => {
            const a = positions.get(e.fromId);
            const b = positions.get(e.toId);
            if (!a || !b) return null;
            const cross =
              !a.isSpouse && !b.isSpouse && (a.crossBranchSpouse || b.crossBranchSpouse);
            return (
              <line
                key={`sp-${e.fromId}-${e.toId}`}
                x1={pct(a.x)}
                y1={pct(a.y)}
                x2={pct(b.x)}
                y2={pct(b.y)}
                stroke={LINE_SPOUSE}
                strokeWidth={cross ? 1.4 : 2}
                strokeDasharray={cross ? "3 5" : "5 4"}
                opacity={cross ? 0.55 : 0.88}
              />
            );
          })}

          {[...people]
            .map((p) => ({ p, pos: positions.get(p.id) }))
            .filter((x): x is { p: Person; pos: SunPosition } => !!x.pos)
            .sort((a, b) => {
              const as = a.pos.isSpouse ? 1 : 0;
              const bs = b.pos.isSpouse ? 1 : 0;
              if (as !== bs) return as - bs;
              return a.pos.ring - b.pos.ring || a.pos.angle - b.pos.angle;
            })
            .map(({ p, pos }) => {
              const isRootSpouse = !!pos.isSpouse && pos.ring === 0;
              const role = spouseRole(p.gender);
              const hasRootSpouses = [...positions.values()].some(
                (x) => x.isSpouse && x.ring === 0,
              );
              return (
              <PersonNode
                key={p.id}
                person={p}
                pos={pos}
                totalRings={ringCount}
                twinOrder={twinOrderInGroup(p, people)}
                twinTotal={twinGroupSize(p, people)}
                married={marriedIds.has(p.id)}
                showCenterLabel={pos.ring === 0 && !pos.isSpouse}
                centerLabel={
                  pos.ring === 0 && !pos.isSpouse ? chartName(p) : null
                }
                centerLabelAbove={
                  pos.ring === 0 && !pos.isSpouse && hasRootSpouses
                }
                spouseCaption={
                  isRootSpouse
                    ? fitLabel(`${role} ${chartName(p)}`, 18)
                    : null
                }
              />
              );
            })}

          {/* أسماء قرب الدوائر */}
          <g className="sun-edge-labels">
            {edges.map((e) => {
              const to = positions.get(e.toId);
              const child = byId.get(e.toId);
              if (!to || !child || to.isSpouse) return null;
              const ring = to.ring;
              const label = chartName(child);
              const short = fitLabel(label, labelMaxForRing(ring, nameMode));
              const fontSize =
                nameMode === "firstOnly"
                  ? ring === 1
                    ? 17
                    : ring === 2
                      ? 14
                      : 12
                  : ring === 1
                    ? 15
                    : ring === 2
                      ? 13
                      : 11;
              const r = nodeRadius(ring, ringCount, false);
              return (
                <NearCircleLabel
                  key={`lbl-ch-${e.fromId}-${e.toId}`}
                  x2={pct(to.x)}
                  y2={pct(to.y)}
                  text={short}
                  fontSize={fontSize}
                  endRadius={r}
                  gap={nameMode === "firstOnly" ? 12 : 14}
                />
              );
            })}
            {spouseEdges.map((e) => {
              const aPos = positions.get(e.fromId);
              const bPos = positions.get(e.toId);
              const a = byId.get(e.fromId);
              const b = byId.get(e.toId);
              if (!aPos || !bPos || !a || !b) return null;

              const spousePerson = aPos.isSpouse ? a : bPos.isSpouse ? b : null;
              const spousePos = aPos.isSpouse ? aPos : bPos.isSpouse ? bPos : null;
              const bloodPos = aPos.isSpouse ? bPos : bPos.isSpouse ? aPos : null;

              if (spousePerson && spousePos && bloodPos) {
                // زوجات الجذر لها تسمية تحت الأيقونة — لا تكرار هنا
                if (spousePos.ring === 0) return null;
                const role = spouseRole(spousePerson.gender);
                const text =
                  nameMode === "firstOnly"
                    ? `${role} ${chartName(spousePerson)}`
                    : `${role} ${spousePerson.givenName}`;
                const r = nodeRadius(spousePos.ring, ringCount, true);
                return (
                  <NearCircleLabel
                    key={`lbl-sp-${e.fromId}-${e.toId}`}
                    x2={pct(spousePos.x)}
                    y2={pct(spousePos.y)}
                    text={text}
                    fontSize={10}
                    fill="#A67C52"
                    endRadius={r}
                    gap={12}
                  />
                );
              }

              const noteNearA =
                nameMode === "firstOnly"
                  ? `${spouseRole(b.gender)} ${chartName(b)}`
                  : `${spouseRole(b.gender)} ${b.givenName}`;
              const noteNearB =
                nameMode === "firstOnly"
                  ? `${spouseRole(a.gender)} ${chartName(a)}`
                  : `${spouseRole(a.gender)} ${a.givenName}`;
              const rA = nodeRadius(aPos.ring, ringCount, !!aPos.isSpouse);
              const rB = nodeRadius(bPos.ring, ringCount, !!bPos.isSpouse);
              return (
                <g key={`lbl-xsp-${e.fromId}-${e.toId}`}>
                  <NearCircleLabel
                    x2={pct(aPos.x)}
                    y2={pct(aPos.y)}
                    text={noteNearA}
                    fontSize={9}
                    fill="#A67C52"
                    endRadius={rA}
                    gap={10}
                  />
                  <NearCircleLabel
                    x2={pct(bPos.x)}
                    y2={pct(bPos.y)}
                    text={noteNearB}
                    fontSize={9}
                    fill="#A67C52"
                    endRadius={rB}
                    gap={10}
                  />
                </g>
              );
            })}
          </g>

          <ChartLegend x={56} y={VB - 300} t={t} />
        </svg>
      </div>

      <footer className="sun-family-doc-footer mt-3 px-2 text-center print:mt-2">
        <p className="text-[10px] italic text-stone-500 print:text-[8pt]">
          {t("printPage.quote")}
        </p>
        <p className="mt-1 text-[9px] text-stone-400 print:text-[7.5pt]">
          {t("printPage.sunPrintQualityHint")}
        </p>
      </footer>
    </div>
  );
}
