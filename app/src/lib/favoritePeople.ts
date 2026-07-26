const key = (treeId: number) => `nasab:favorites:${treeId}`;

export function getFavoritePersonIds(treeId: number): number[] {
  try {
    const raw = localStorage.getItem(key(treeId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 24);
  } catch {
    return [];
  }
}

export function isFavoritePerson(treeId: number, personId: number): boolean {
  return getFavoritePersonIds(treeId).includes(personId);
}

/** يبدّل التثبيت ويعيد القائمة الجديدة */
export function toggleFavoritePersonId(
  treeId: number,
  personId: number,
): number[] {
  try {
    const prev = getFavoritePersonIds(treeId);
    const next = prev.includes(personId)
      ? prev.filter((id) => id !== personId)
      : [personId, ...prev].slice(0, 24);
    localStorage.setItem(key(treeId), JSON.stringify(next));
    return next;
  } catch {
    return getFavoritePersonIds(treeId);
  }
}
