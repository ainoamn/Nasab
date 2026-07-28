import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person } from "@db/schema";
import {
  computeFanLayout,
  formatPrintChartName,
  fullNasabName,
  groupByGeneration,
} from "@/lib/printData";
import {
  buildSpouseNotesMap,
  collectMarriageLinks,
  preferredParentId,
} from "@/lib/printLineage";
import { twinGroupSize, twinOrderInGroup } from "@/lib/twins";
import type { PrintNameMode } from "@/lib/printFilter";
import { PrintMetaFooter, PrintMetaHeader } from "./shared";
import type { PrintTemplateProps } from "./types";

const VB_W = 1600;
const VB_H = 1000;
const LINE_SPOUSE = "#C4A574";

function fanLabel(
  p: Person,
  ringIdx: number,
  nameMode: PrintNameMode,
  tribe?: string | null,
): string {
  const name = formatPrintChartName(p, nameMode, tribe);
  if (nameMode === "firstOnly") return name;
  const max = ringIdx === 0 ? 40 : ringIdx === 1 ? 32 : 24;
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

/**
 * مروحة نسب كـ SVG خالص — مع خط نسب عند الأب وروابط زواج خفيفة.
 */
export default function FanChartPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId, scopeSummary, accent, designName, today } =
    props;
  const nameMode: PrintNameMode = props.nameMode ?? "full";
  const { t, i18n } = useTranslation();

  const layout = useMemo(
    () => computeFanLayout(people, levels, rootPersonId),
    [people, levels, rootPersonId],
  );
  const groups = useMemo(() => groupByGeneration(people, levels), [people, levels]);
  const spouseNotes = useMemo(
    () =>
      buildSpouseNotesMap(people, rels, {
        wife: t("printPage.spouseWife"),
        husband: t("printPage.spouseHusband"),
      }),
    [people, rels, t, i18n.language],
  );
  const marriageLinks = useMemo(
    () => collectMarriageLinks(people, rels),
    [people, rels],
  );
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const parentEdges = useMemo(() => {
    const edges: { fromId: number; toId: number }[] = [];
    for (const p of people) {
      const pref = preferredParentId(p.id, rels, byId);
      if (pref == null || pref === p.id) continue;
      if (!layout.has(pref) || !layout.has(p.id)) continue;
      edges.push({ fromId: pref, toId: p.id });
    }
    return edges;
  }, [people, rels, byId, layout]);

  const rootPerson = people.find((p) => p.id === rootPersonId);
  const rootLabel = rootPerson
    ? rootPerson.fatherName?.trim()
      ? fullNasabName(rootPerson, tree.tribe)
      : rootPerson.givenName
    : tree.name;

  const arcs = useMemo(() => {
    const cx = VB_W / 2;
    const cy = VB_H * 0.92;
    return Array.from({ length: Math.max(1, groups.length) }, (_, i) => {
      const r = 80 + i * 110;
      const start = (-165 * Math.PI) / 180;
      const end = (-15 * Math.PI) / 180;
      const x1 = cx + r * Math.cos(start);
      const y1 = cy + r * Math.sin(start);
      const x2 = cx + r * Math.cos(end);
      const y2 = cy + r * Math.sin(end);
      return { i, d: `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}` };
    });
  }, [groups.length]);

  const nodePos = useMemo(() => {
    const map = new Map<number, { x: number; y: number }>();
    for (const [id, pos] of layout) {
      map.set(id, { x: (pos.x / 100) * VB_W, y: (pos.y / 100) * VB_H });
    }
    return map;
  }, [layout]);

  const nodes = useMemo(() => {
    const levelIndex = new Map<number, number>();
    groups.forEach((g, i) => levelIndex.set(g.level, i));
    return people
      .map((p) => {
        const pos = layout.get(p.id);
        if (!pos) return null;
        const ringIdx = levelIndex.get(levels.get(p.id) ?? 0) ?? 0;
        return {
          p,
          x: (pos.x / 100) * VB_W,
          y: (pos.y / 100) * VB_H,
          ringIdx,
          female: p.gender === "female",
        };
      })
      .filter(Boolean) as Array<{
      p: Person;
      x: number;
      y: number;
      ringIdx: number;
      female: boolean;
    }>;
  }, [people, layout, levels, groups]);

  return (
    <div className="print-fan-root">
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
        className="mb-3 text-center pb-3 border-b-2"
        titleClass="text-2xl md:text-3xl"
      />

      <div
        className="print-fan-stage relative mx-auto w-full overflow-hidden rounded-2xl border-2"
        style={{
          borderColor: `${accent}55`,
          background:
            "radial-gradient(ellipse at 50% 100%, #e8f5e3 0%, #fafcf8 55%, #fff 100%)",
          aspectRatio: "16 / 10",
        }}
      >
        <svg
          className="print-fan-svg h-full w-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={t("printPage.fanHint")}
        >
          {arcs.map((a) => (
            <path
              key={a.i}
              d={a.d}
              fill="none"
              stroke={accent}
              strokeWidth={1.4}
              opacity={0.28}
            />
          ))}

          {parentEdges.map((e) => {
            const a = nodePos.get(e.fromId);
            const b = nodePos.get(e.toId);
            if (!a || !b) return null;
            return (
              <line
                key={`ch-${e.fromId}-${e.toId}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="#6B7280"
                strokeWidth={1.2}
                opacity={0.4}
              />
            );
          })}

          {marriageLinks.map((e) => {
            const a = nodePos.get(e.fromId);
            const b = nodePos.get(e.toId);
            if (!a || !b) return null;
            return (
              <line
                key={`sp-${e.fromId}-${e.toId}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={LINE_SPOUSE}
                strokeWidth={1.3}
                strokeDasharray="4 4"
                opacity={0.65}
              />
            );
          })}

          <g transform={`translate(${VB_W / 2}, ${VB_H - 36})`}>
            <rect
              x={-160}
              y={-22}
              width={320}
              height={44}
              rx={22}
              fill="#fff"
              stroke={accent}
              strokeWidth={2.5}
            />
            <text
              y={-4}
              textAnchor="middle"
              fontSize={11}
              fill="#78716c"
              fontFamily="'Noto Naskh Arabic', Tahoma, sans-serif"
            >
              {t("printPage.fanRoot")}
            </text>
            <text
              y={14}
              textAnchor="middle"
              fontSize={15}
              fontWeight={700}
              fill={accent}
              fontFamily="'Noto Naskh Arabic', 'Amiri', serif"
            >
              {rootLabel.length > 36 ? `${rootLabel.slice(0, 34)}…` : rootLabel}
            </text>
          </g>

          {nodes.map(({ p, x, y, ringIdx, female }) => {
            const r = ringIdx === 0 ? 22 : ringIdx === 1 ? 18 : 14;
            const fill = female ? "#FCE8F2" : "#E8F5FB";
            const twinOrd = twinOrderInGroup(p, people);
            const twinTot = twinGroupSize(p, people);
            const isTw = twinOrd != null && twinTot >= 2;
            const notes = spouseNotes.get(p.id) ?? [];
            const stroke = isTw ? "#7c3aed" : female ? "#F5B8DB" : "#9FD5EB";
            const label = fanLabel(p, ringIdx, nameMode, tree.tribe);
            const fs = ringIdx === 0 ? 13 : ringIdx === 1 ? 11 : 10;
            return (
              <g key={p.id} transform={`translate(${x}, ${y})`}>
                <circle cx={0} cy={0} r={r} fill={fill} stroke={stroke} strokeWidth={isTw ? 3 : 2} />
                <circle
                  cx={0}
                  cy={-r * 0.2}
                  r={r * 0.28}
                  fill={female ? "#D4A0B8" : "#7BA8C4"}
                  opacity={0.85}
                />
                {isTw && (
                  <g transform={`translate(${r * 0.6}, ${-r * 0.7})`}>
                    <circle cx={0} cy={0} r={9} fill="#7c3aed" stroke="#fff" strokeWidth={1.2} />
                    <text
                      y={1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={9}
                      fontWeight={700}
                      fill="#fff"
                      fontFamily="Tahoma, sans-serif"
                    >
                      {t("twins.mark", { order: twinOrd })}
                    </text>
                  </g>
                )}
                <text
                  y={r + 14}
                  textAnchor="middle"
                  fontSize={fs}
                  fontWeight={600}
                  fill="#1c1917"
                  fontFamily="'Noto Naskh Arabic', Tahoma, sans-serif"
                  stroke="#fafcf8"
                  strokeWidth={3}
                  paintOrder="stroke fill"
                >
                  {label}
                </text>
                {notes.length > 0 && (
                  <text
                    y={r + 14 + fs + 2}
                    textAnchor="middle"
                    fontSize={Math.max(8, fs - 3)}
                    fontWeight={600}
                    fill="#A67C52"
                    fontFamily="'Noto Naskh Arabic', Tahoma, sans-serif"
                    stroke="#fafcf8"
                    strokeWidth={2.5}
                    paintOrder="stroke fill"
                  >
                    {notes.join(" · ")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-3 text-center text-xs text-stone-500">{t("printPage.fanHint")}</p>
      <PrintMetaFooter
        designName={designName}
        accent={accent}
        people={people}
        rels={rels}
        levels={levels}
        rootPersonId={rootPersonId}
        today={today}
      />
    </div>
  );
}
