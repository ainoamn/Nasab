const dayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const storageKey = (treeId: number) =>
  `nasab:todayEventsDismissed:${treeId}:${dayKey()}`;

export function isTodayEventsDismissed(treeId: number): boolean {
  try {
    return localStorage.getItem(storageKey(treeId)) === "1";
  } catch {
    return false;
  }
}

export function dismissTodayEvents(treeId: number) {
  try {
    localStorage.setItem(storageKey(treeId), "1");
  } catch {
    /* ignore */
  }
}
