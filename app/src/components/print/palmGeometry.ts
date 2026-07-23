/** هندسة النخلة العمانية — سعف منحنية مع خوص على جانبي الساق */

export type Point = { x: number; y: number };

export type PalmFrondArc = {
  id: number;
  tip: Point;
  ctrl: Point;
};

export const PALM_CROWN: Point = { x: 600, y: 500 };

/** سبعة سعوف متناظرة من التاج */
export const PALM_FROND_ARCS: PalmFrondArc[] = [
  { id: 0, tip: { x: 600, y: 48 }, ctrl: { x: 600, y: 230 } },
  { id: 1, tip: { x: 330, y: 88 }, ctrl: { x: 485, y: 265 } },
  { id: 2, tip: { x: 870, y: 88 }, ctrl: { x: 715, y: 265 } },
  { id: 3, tip: { x: 185, y: 168 }, ctrl: { x: 415, y: 325 } },
  { id: 4, tip: { x: 1015, y: 168 }, ctrl: { x: 785, y: 325 } },
  { id: 5, tip: { x: 95, y: 298 }, ctrl: { x: 350, y: 415 } },
  { id: 6, tip: { x: 1105, y: 298 }, ctrl: { x: 850, y: 415 } },
];

export function quadPoint(crown: Point, ctrl: Point, tip: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * crown.x + 2 * u * t * ctrl.x + t * t * tip.x,
    y: u * u * crown.y + 2 * u * t * ctrl.y + t * t * tip.y,
  };
}

/** مماس المنحنى — زاوية السعف عند t */
export function tangentAngle(crown: Point, ctrl: Point, tip: Point, t: number): number {
  const u = 1 - t;
  const dx = 2 * u * (ctrl.x - crown.x) + 2 * t * (tip.x - ctrl.x);
  const dy = 2 * u * (ctrl.y - crown.y) + 2 * t * (tip.y - ctrl.y);
  return Math.atan2(dy, dx);
}

export function frondPath(arc: PalmFrondArc, crown = PALM_CROWN): string {
  return `M ${crown.x} ${crown.y} Q ${arc.ctrl.x} ${arc.ctrl.y} ${arc.tip.x} ${arc.tip.y}`;
}

/** خوص صغيرة على جانبي السعف — شكل واقعي */
export function frondPinnaePaths(
  arc: PalmFrondArc,
  crown = PALM_CROWN,
  count = 18,
): string[] {
  const paths: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = 0.12 + (i / (count - 1)) * 0.82;
    const pt = quadPoint(crown, arc.ctrl, arc.tip, t);
    const angle = tangentAngle(crown, arc.ctrl, arc.tip, t);
    const len = 14 + (1 - t) * 22;
    const spread = 0.72;

    for (const side of [-1, 1]) {
      const a = angle + side * spread;
      const ex = pt.x + Math.cos(a) * len;
      const ey = pt.y + Math.sin(a) * len;
      const mx = pt.x + Math.cos(a) * len * 0.55;
      const my = pt.y + Math.sin(a) * len * 0.55;
      const perp = angle + (side * Math.PI) / 2;
      const w = 3.5 - t * 1.2;
      const lx = mx + Math.cos(perp) * w;
      const ly = my + Math.sin(perp) * w;
      const rx = mx - Math.cos(perp) * w;
      const ry = my - Math.sin(perp) * w;
      paths.push(`M ${pt.x} ${pt.y} Q ${lx} ${ly} ${ex} ${ey} Q ${rx} ${ry} ${pt.x} ${pt.y} Z`);
    }
  }
  return paths;
}

export function leafletPositions(
  arc: PalmFrondArc,
  count: number,
  crown = PALM_CROWN,
): Point[] {
  if (count <= 0) return [];
  const ts =
    count === 1
      ? [0.42]
      : count === 2
        ? [0.36, 0.58]
        : count === 3
          ? [0.32, 0.5, 0.68]
          : [0.28, 0.42, 0.56, 0.7, 0.84].slice(0, count);
  return ts.map((t) => quadPoint(crown, arc.ctrl, arc.tip, t));
}

export function couplePosition(arc: PalmFrondArc, crown = PALM_CROWN): Point {
  return quadPoint(crown, arc.ctrl, arc.tip, 0.18);
}

export function tipPosition(arc: PalmFrondArc, crown = PALM_CROWN): Point {
  return quadPoint(crown, arc.ctrl, arc.tip, 0.9);
}

/** إزاحة جانبية للخوص حسب موقعه على السعف */
export function leafletOffset(
  arc: PalmFrondArc,
  index: number,
  crown = PALM_CROWN,
): { dx: number; dy: number } {
  const ts = [0.28, 0.42, 0.56, 0.7, 0.84];
  const t = ts[index] ?? 0.5;
  const angle = tangentAngle(crown, arc.ctrl, arc.tip, t);
  const side = index % 2 === 0 ? -1 : 1;
  const dist = 18;
  return {
    dx: Math.cos(angle + side * 0.85) * dist,
    dy: Math.sin(angle + side * 0.85) * dist,
  };
}
