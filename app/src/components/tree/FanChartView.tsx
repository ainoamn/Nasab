import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { getParents } from "@/lib/familyGraph";
import { relationToFocus } from "@/lib/relationshipLabel";
import { isTwin, twinMarkLabel, twinMarkWord } from "@/lib/twins";
import { cn } from "@/lib/utils";

type Props = {
  people: Person[];
  rels: Relationship[];
  focusId: number;
  generations?: number;
  selectedPersonId?: number | null;
  kinshipFocusId?: number | null;
  onPersonClick?: (person: Person) => void;
  onFocusPerson?: (person: Person) => void;
  onAddParent?: (childId: number, role: "father" | "mother") => void;
};

type Slot = {
  id: number | null;
  childId: number | null;
  role: "father" | "mother" | "focus" | null;
  ring: number;
  startAngle: number;
  endAngle: number;
};

const CX = 500;
const CY = 520;
const VB_W = 1000;
const VB_H = 560;

function polar(r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const p0o = polar(r1, a0);
  const p1o = polar(r1, a1);
  const p1i = polar(r0, a1);
  const p0i = polar(r0, a0);
  return [
    `M ${p0o.x} ${p0o.y}`,
    `A ${r1} ${r1} 0 ${large} 1 ${p1o.x} ${p1o.y}`,
    `L ${p1i.x} ${p1i.y}`,
    `A ${r0} ${r0} 0 ${large} 0 ${p0i.x} ${p0i.y}`,
    "Z",
  ].join(" ");
}

/**
 * مظهر مروحي تفاعلي: أجيال أقواس متحدة المركز، نص داخل القطاع، بلا أسهم.
 */
export default function FanChartView({
  people,
  rels,
  focusId,
  generations = 5,
  selectedPersonId,
  kinshipFocusId = null,
  onPersonClick,
  onFocusPerson,
  onAddParent,
}: Props) {
  const { t, i18n } = useTranslation();
  const dash = t("common.emDash");
  const twinWord = twinMarkWord(i18n.language);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const focus = byId.get(focusId);
  const kinId = kinshipFocusId ?? focusId;

  const slots = useMemo(() => {
    const out: Slot[] = [];
    out.push({
      id: focusId,
      childId: null,
      role: "focus",
      ring: 0,
      startAngle: -20,
      endAngle: 20,
    });

    type Frontier = { id: number | null; a0: number; a1: number };
    let frontier: Frontier[] = [{ id: focusId, a0: -90, a1: 90 }];

    for (let ring = 1; ring < generations; ring++) {
      const next: Frontier[] = [];
      for (const cell of frontier) {
        const mid = (cell.a0 + cell.a1) / 2;
        const left: Frontier = { id: null, a0: cell.a0, a1: mid };
        const right: Frontier = { id: null, a0: mid, a1: cell.a1 };
        if (cell.id != null) {
          const { fatherId, motherId } = getParents(cell.id, rels, byId);
          left.id = fatherId;
          right.id = motherId;
        }
        out.push({
          id: left.id,
          childId: cell.id,
          role: "father",
          ring,
          startAngle: left.a0,
          endAngle: left.a1,
        });
        out.push({
          id: right.id,
          childId: cell.id,
          role: "mother",
          ring,
          startAngle: right.a0,
          endAngle: right.a1,
        });
        next.push(left, right);
      }
      frontier = next;
    }
    return out;
  }, [byId, focusId, generations, rels]);

  const ringInner = (ring: number) => 70 + ring * 78;
  const ringOuter = (ring: number) => ringInner(ring) + 76;

  const branchColors = ["#93c5fd", "#f9a8d4", "#86efac", "#fde68a", "#c4b5fd"];

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <p className="absolute top-3 start-3 z-10 rounded-full border bg-white/90 px-2.5 py-1 text-[11px] text-stone-500 shadow-sm">
        {t("chart.fanHint")}
      </p>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="mx-auto h-[min(70vh,720px)] w-full max-w-5xl"
        role="img"
        aria-label={t("chart.viewFan")}
      >
        {/* أقواس خلفية خفيفة */}
        {Array.from({ length: generations }, (_, ring) => (
          <path
            key={`guide-${ring}`}
            d={arcPath(ringInner(ring), ringOuter(ring), -90, 90)}
            fill="none"
            stroke="#e7e5e4"
            strokeWidth={1}
          />
        ))}

        {slots
          .filter((s) => s.ring > 0)
          .map((slot, i) => {
            const person = slot.id != null ? byId.get(slot.id) : null;
            const selected = person != null && person.id === selectedPersonId;
            const mid = (slot.startAngle + slot.endAngle) / 2;
            const rLabel = (ringInner(slot.ring) + ringOuter(slot.ring)) / 2;
            const pos = polar(rLabel, mid);
            const female = person?.gender === "female";
            const twin = person != null && isTwin(person, people);
            const fill = !person
              ? "#fafaf9"
              : twin
                ? "#f5f3ff"
                : female
                  ? "#fce8f1"
                  : "#e3f0fb";
            const stroke = selected
              ? "#0ea5e9"
              : twin
                ? "#7c3aed"
                : branchColors[slot.ring % branchColors.length];

            const canAddParent =
              !person &&
              slot.childId != null &&
              onAddParent &&
              (slot.role === "father" || slot.role === "mother");

            return (
              <g
                key={`s-${slot.ring}-${i}`}
                className={cn(
                  (person || canAddParent) && "cursor-pointer",
                )}
                onClick={() => {
                  if (person) onPersonClick?.(person);
                  else if (
                    slot.childId != null &&
                    onAddParent &&
                    (slot.role === "father" || slot.role === "mother")
                  ) {
                    onAddParent(slot.childId, slot.role);
                  }
                }}
                onDoubleClick={(e) => {
                  if (!person || !onFocusPerson) return;
                  e.preventDefault();
                  e.stopPropagation();
                  onFocusPerson(person);
                }}
              >
                {person ? (
                  <title>
                    {(() => {
                      const mark = twinMarkLabel(person, people, twinWord);
                      return `${person.givenName}${mark ? ` · ${mark}` : ""} ${dash} ${t(
                        `tree.rel.${relationToFocus(kinId, person.id, people, rels)}`,
                      )}${onFocusPerson ? ` · ${t("chart.doubleClickFocus")}` : ""}`;
                    })()}
                  </title>
                ) : canAddParent ? (
                  <title>
                    {slot.role === "father"
                      ? t("chart.addFather")
                      : t("chart.addMother")}
                  </title>
                ) : null}
                <path
                  d={arcPath(
                    ringInner(slot.ring),
                    ringOuter(slot.ring),
                    slot.startAngle,
                    slot.endAngle,
                  )}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={selected || twin ? 2.4 : 1.1}
                />
                {person ? (
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.max(9, 14 - slot.ring)}
                    fontWeight={600}
                    fill="#1c1917"
                    style={{ pointerEvents: "none" }}
                  >
                    {person.givenName.length > 12
                      ? `${person.givenName.slice(0, 11)}…`
                      : person.givenName}
                  </text>
                ) : (
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={16}
                    fill="#d6d3d1"
                    style={{ pointerEvents: "none" }}
                    aria-hidden={!canAddParent}
                  >
                    +
                  </text>
                )}
              </g>
            );
          })}

        {/* الجذر في الأسفل */}
        {focus && (
          <g
            className="cursor-pointer"
            onClick={() => onPersonClick?.(focus)}
            onDoubleClick={(e) => {
              if (!onFocusPerson) return;
              e.preventDefault();
              e.stopPropagation();
              onFocusPerson(focus);
            }}
          >
            <title>
              {(() => {
                const mark = twinMarkLabel(focus, people, twinWord);
                return `${focus.givenName}${mark ? ` · ${mark}` : ""} ${dash} ${t("tree.rel.self")}${
                  onFocusPerson ? ` · ${t("chart.doubleClickFocus")}` : ""
                }`;
              })()}
            </title>
            <circle
              cx={CX}
              cy={CY - 8}
              r={58}
              fill={focus.gender === "female" ? "#fce8f1" : "#e3f0fb"}
              stroke={
                selectedPersonId === focus.id
                  ? "#0ea5e9"
                  : focus.gender === "female"
                    ? "#f9a8d4"
                    : "#93c5fd"
              }
              strokeWidth={selectedPersonId === focus.id ? 3 : 2}
            />
            <text
              x={CX}
              y={CY - 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={15}
              fontWeight={700}
              fill="#1c1917"
            >
              {focus.givenName.length > 14
                ? `${focus.givenName.slice(0, 13)}…`
                : focus.givenName}
            </text>
            {focus.birthYear && (
              <text
                x={CX}
                y={CY + 6}
                textAnchor="middle"
                fontSize={11}
                fill="#78716c"
              >
                {focus.birthYear}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
