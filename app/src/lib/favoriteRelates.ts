export type FavoriteRelatePair = { a: number; b: number };

const key = (treeId: number) => `nasab:favoriteRelates:${treeId}`;

function normalize(a: number, b: number): FavoriteRelatePair {
  return a < b ? { a, b } : { a: b, b: a };
}

export function getFavoriteRelates(treeId: number): FavoriteRelatePair[] {
  try {
    const raw = localStorage.getItem(key(treeId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const out: FavoriteRelatePair[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const a = Number((item as { a?: unknown }).a);
      const b = Number((item as { b?: unknown }).b);
      if (
        !Number.isFinite(a) ||
        !Number.isFinite(b) ||
        a <= 0 ||
        b <= 0 ||
        a === b
      ) {
        continue;
      }
      out.push(normalize(a, b));
    }
    const seen = new Set<string>();
    return out
      .filter((p) => {
        const k = `${p.a}:${p.b}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function isFavoriteRelate(
  treeId: number,
  a: number,
  b: number,
): boolean {
  if (a === b) return false;
  const pair = normalize(a, b);
  return getFavoriteRelates(treeId).some(
    (p) => p.a === pair.a && p.b === pair.b,
  );
}

/** يبدّل تثبيت زوج القرابة ويعيد القائمة */
export function toggleFavoriteRelate(
  treeId: number,
  a: number,
  b: number,
): FavoriteRelatePair[] {
  try {
    if (a === b || a <= 0 || b <= 0) return getFavoriteRelates(treeId);
    const pair = normalize(a, b);
    const prev = getFavoriteRelates(treeId);
    const exists = prev.some((p) => p.a === pair.a && p.b === pair.b);
    const next = exists
      ? prev.filter((p) => !(p.a === pair.a && p.b === pair.b))
      : [pair, ...prev].slice(0, 12);
    localStorage.setItem(key(treeId), JSON.stringify(next));
    return next;
  } catch {
    return getFavoriteRelates(treeId);
  }
}
