import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person } from "@db/schema";
import {
  computeSunLayout,
  fullNasabName,
  type SunPosition,
} from "@/lib/printData";
import type { PrintTemplateProps } from "./types";

/** ألوان مطابقة لمرجع MyHeritage */
const BG = "#FDF9EF";
const LINE = "#808080";
const MALE_BORDER = "#9FD5EB";
const FEMALE_BORDER = "#F5B8DB";
const MALE_FILL = "#E8F5FB";
const FEMALE_FILL = "#FCE8F2";
const TEXT = "#1a1a1a";
const MUTED = "#6b6b6b";

const VB = 2000;
const CX = 1000;
const CY = 1000;

function pct(n: number) {
  return (n / 100) * VB;
}

function sunName(p: Person, laqabFallback?: string | null): string {
  const parts = [p.givenName];
  if (p.fatherName) {
    parts.push(p.gender === "female" ? `بنت ${p.fatherName}` : `بن ${p.fatherName}`);
  }
  const laqab = p.laqab?.trim() || laqabFallback?.trim();
  if (laqab) parts.push(laqab);
  return parts.join(" ");
}

function yearLabel(p: Person): string | null {
  if (p.birthYear && p.deathYear) return `b. ${p.birthYear}  d. ${p.deathYear}`;
  if (p.birthYear) return `b. ${p.birthYear}`;
  if (p.deathYear) return `d. ${p.deathYear}`;
  return null;
}

/** تدوير النص ليبقى مقروءاً كنمط MyHeritage */
function labelTransform(angleDeg: number): { rotate: number; flip: boolean } {
  let a = ((angleDeg % 360) + 360) % 360;
  if (a > 180) a -= 360;
  if (a > 90 || a < -90) return { rotate: angleDeg + 180, flip: true };
  return { rotate: angleDeg, flip: false };
}

function nodeRadius(ring: number, totalRings: number): number {
  if (ring === 0) return 42;
  if (totalRings <= 3) return ring === 1 ? 28 : 22;
  if (ring === 1) return 26;
  if (ring === 2) return 20;
  return 16;
}

function Silhouette({ female, size }: { female: boolean; size: number }) {
  // رأس + أكتاف بسيط بأسلوب الأيقونة الافتراضية
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

function PersonNode({
  person,
  pos,
  totalRings,
  laqabFallback,
}: {
  person: Person;
  pos: SunPosition;
  totalRings: number;
  laqabFallback?: string | null;
}) {
  const x = pct(pos.x);
  const y = pct(pos.y);
  const female = person.gender === "female";
  const r = nodeRadius(pos.ring, totalRings);
  const border = female ? FEMALE_BORDER : MALE_BORDER;
  const fill = female ? FEMALE_FILL : MALE_FILL;
  const name = sunName(person, laqabFallback);
  const years = yearLabel(person);
  const { rotate, flip } = labelTransform(pos.angle);
  const photo = person.photoUrl;
  const labelGap = r + 8;
  const fontSize = pos.ring === 0 ? 22 : pos.ring === 1 ? 16 : pos.ring === 2 ? 13 : 11;

  // في المركز: الاسم بجانب الدائرة أفقياً (يسار للذكر / يمين للأنثى غالباً)
  if (pos.ring === 0) {
    const nameOnLeft = pos.angle > 90 || pos.angle < -90 || pos.x < 50;
    return (
      <g transform={`translate(${x}, ${y})`}>
        {photo ? (
          <>
            <defs>
              <clipPath id={`mh-clip-${person.id}`}>
                <circle cx={0} cy={0} r={r} />
              </clipPath>
            </defs>
            <circle cx={0} cy={0} r={r + 2} fill="#fff" stroke={border} strokeWidth={3} />
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
            <circle cx={0} cy={0} r={r} fill={fill} stroke={border} strokeWidth={3} />
            <Silhouette female={female} size={r} />
          </>
        )}
        <text
          x={nameOnLeft ? -(r + 10) : r + 10}
          y={0}
          textAnchor={nameOnLeft ? "end" : "start"}
          dominantBaseline="middle"
          fontSize={22}
          fontWeight={600}
          fill={TEXT}
          fontFamily="DejaVu Sans, 'Noto Naskh Arabic', Tahoma, sans-serif"
        >
          {name}
        </text>
      </g>
    );
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      {photo ? (
        <>
          <defs>
            <clipPath id={`mh-clip-${person.id}`}>
              <circle cx={0} cy={0} r={r} />
            </clipPath>
          </defs>
          <circle cx={0} cy={0} r={r + 1.5} fill="#fff" stroke={border} strokeWidth={2.2} />
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
          <circle cx={0} cy={0} r={r} fill={fill} stroke={border} strokeWidth={2.2} />
          <Silhouette female={female} size={r} />
        </>
      )}

      <g transform={`rotate(${rotate})`}>
        <text
          x={flip ? -labelGap : labelGap}
          y={years ? -5 : 0}
          textAnchor={flip ? "end" : "start"}
          dominantBaseline="middle"
          fontSize={fontSize}
          fontWeight={600}
          fill={TEXT}
          fontFamily="DejaVu Sans, 'Noto Naskh Arabic', Tahoma, sans-serif"
        >
          {name}
        </text>
        {years && (
          <text
            x={flip ? -labelGap : labelGap}
            y={10}
            textAnchor={flip ? "end" : "start"}
            dominantBaseline="middle"
            fontSize={Math.max(9, fontSize - 4)}
            fill={MUTED}
            fontFamily="DejaVu Sans, Tahoma, sans-serif"
          >
            {years}
          </text>
        )}
      </g>
    </g>
  );
}

export default function SunRingPrint(props: PrintTemplateProps) {
  const { tree, people, rels, levels, rootPersonId } = props;
  const { t } = useTranslation();

  const layout = useMemo(
    () => computeSunLayout(people, rels, levels, rootPersonId),
    [people, rels, levels, rootPersonId],
  );

  const { positions, edges, spouseEdges, ringCount, rootIds } = layout;

  const titleNames = useMemo(() => {
    const roots = rootIds.map((id) => people.find((p) => p.id === id)).filter(Boolean) as Person[];
    if (roots.length === 0) return tree.name;
    return roots.map((p) => fullNasabName(p, tree.tribe)).join(" و ");
  }, [rootIds, people, tree.name, tree.tribe]);

  const titleText = t("printPage.sunTitle", { names: titleNames });
  const countText = t("printPage.sunPeopleCount", { count: people.length });

  /** نقطة بداية الخط: منتصف الزوجين إن وُجد زوج على نفس الحلقة */
  const edgeStart = (fromId: number): { x: number; y: number } | null => {
    const from = positions.get(fromId);
    if (!from) return null;
    const spouseEdge = spouseEdges.find((e) => e.fromId === fromId || e.toId === fromId);
    if (spouseEdge) {
      const a = positions.get(spouseEdge.fromId);
      const b = positions.get(spouseEdge.toId);
      if (a && b) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    // جذر المركز: منتصف كل الجذور
    if (from.ring === 0 && rootIds.length > 1) {
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (const id of rootIds) {
        const p = positions.get(id);
        if (!p) continue;
        sx += p.x;
        sy += p.y;
        n++;
      }
      if (n > 0) return { x: sx / n, y: sy / n };
    }
    return { x: from.x, y: from.y };
  };

  const titleR = 820;
  // قوس علوي (من اليسار لليمين عبر الأعلى)
  const titlePath = `M ${CX - titleR * 0.72} ${CY - titleR * 0.7} A ${titleR} ${titleR} 0 0 1 ${CX + titleR * 0.72} ${CY - titleR * 0.7}`;
  const countR = 760;
  const countPath = `M ${CX - countR * 0.55} ${CY - countR * 0.82} A ${countR} ${countR} 0 0 1 ${CX + countR * 0.55} ${CY - countR * 0.82}`;

  return (
    <div className="sun-mh-print" style={{ background: BG }}>
      <div
        className="relative mx-auto print:max-w-none"
        style={{
          background: BG,
          maxWidth: "1100px",
          aspectRatio: "1 / 1",
        }}
      >
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="w-full h-full print-sun-svg"
          role="img"
          aria-label={titleText}
          style={{ background: BG }}
        >
          <rect width={VB} height={VB} fill={BG} />

          {/* عنوان مقوّس أعلى الدائرة */}
          <defs>
            <path id="sun-title-arc" d={titlePath} fill="none" />
            <path id="sun-count-arc" d={countPath} fill="none" />
          </defs>
          <text
            fill={TEXT}
            fontSize={36}
            fontWeight={700}
            fontFamily="DejaVu Sans, 'Noto Naskh Arabic', Tahoma, sans-serif"
          >
            <textPath href="#sun-title-arc" startOffset="50%" textAnchor="middle">
              {titleText}
            </textPath>
          </text>
          <text
            fill={MUTED}
            fontSize={22}
            fontFamily="DejaVu Sans, 'Noto Naskh Arabic', Tahoma, sans-serif"
          >
            <textPath href="#sun-count-arc" startOffset="50%" textAnchor="middle">
              {countText}
            </textPath>
          </text>

          {/* روابط الأزواج — خطوط قصيرة */}
          {spouseEdges.map((e) => {
            const a = positions.get(e.fromId);
            const b = positions.get(e.toId);
            if (!a || !b) return null;
            return (
              <line
                key={`sp-${e.fromId}-${e.toId}`}
                x1={pct(a.x)}
                y1={pct(a.y)}
                x2={pct(b.x)}
                y2={pct(b.y)}
                stroke={LINE}
                strokeWidth={1.6}
                opacity={0.7}
              />
            );
          })}

          {/* روابط الأبناء من منتصف الزوجين */}
          {edges.map((e) => {
            const start = edgeStart(e.fromId);
            const to = positions.get(e.toId);
            if (!start || !to) return null;
            return (
              <line
                key={`ch-${e.fromId}-${e.toId}`}
                x1={pct(start.x)}
                y1={pct(start.y)}
                x2={pct(to.x)}
                y2={pct(to.y)}
                stroke={LINE}
                strokeWidth={1.4}
                opacity={0.55}
              />
            );
          })}

          {/* الأشخاص — من الداخل للخارج */}
          {[...people]
            .sort((a, b) => (positions.get(a.id)?.ring ?? 99) - (positions.get(b.id)?.ring ?? 99))
            .map((p) => {
              const pos = positions.get(p.id);
              if (!pos) return null;
              return (
                <PersonNode
                  key={p.id}
                  person={p}
                  pos={pos}
                  totalRings={ringCount}
                  laqabFallback={tree.tribe}
                />
              );
            })}
        </svg>
      </div>
    </div>
  );
}
