const key = (treeId: number) => `nasab:recentPeople:${treeId}`;

export function getRecentPersonIds(treeId: number): number[] {
  try {
    const raw = localStorage.getItem(key(treeId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 12);
  } catch {
    return [];
  }
}

export function pushRecentPersonId(treeId: number, personId: number) {
  try {
    const prev = getRecentPersonIds(treeId).filter((id) => id !== personId);
    const next = [personId, ...prev].slice(0, 12);
    localStorage.setItem(key(treeId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
