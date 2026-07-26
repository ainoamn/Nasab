export type RecentRelatePair = { a: number; b: number };

const key = (treeId: number) => `nasab:recentRelates:${treeId}`;

function normalize(a: number, b: number): RecentRelatePair {
  return a < b ? { a, b } : { a: b, b: a };
}

export function getRecentRelates(treeId: number): RecentRelatePair[] {
  try {
    const raw = localStorage.getItem(key(treeId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const out: RecentRelatePair[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const a = Number((item as { a?: unknown }).a);
      const b = Number((item as { b?: unknown }).b);
      if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0 || a === b) {
        continue;
      }
      out.push(normalize(a, b));
    }
    // dedupe
    const seen = new Set<string>();
    return out
      .filter((p) => {
        const k = `${p.a}:${p.b}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);
  } catch {
    return [];
  }
}

export function pushRecentRelate(
  treeId: number,
  a: number,
  b: number,
): RecentRelatePair[] {
  try {
    if (a === b || a <= 0 || b <= 0) return getRecentRelates(treeId);
    const pair = normalize(a, b);
    const prev = getRecentRelates(treeId).filter(
      (p) => !(p.a === pair.a && p.b === pair.b),
    );
    const next = [pair, ...prev].slice(0, 8);
    localStorage.setItem(key(treeId), JSON.stringify(next));
    return next;
  } catch {
    return getRecentRelates(treeId);
  }
}
