const key = (treeId: number) => `nasab:dismissedDiscoveries:${treeId}`;

export function discoveryDismissKey(
  kind: string,
  personId: number,
  otherPersonId?: number,
): string {
  return `${kind}:${personId}:${otherPersonId ?? 0}`;
}

export function getDismissedDiscoveryKeys(treeId: number): string[] {
  try {
    const raw = localStorage.getItem(key(treeId));
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string").slice(0, 200);
  } catch {
    return [];
  }
}

export function dismissDiscoveryKey(treeId: number, dismissKey: string): string[] {
  try {
    const prev = getDismissedDiscoveryKeys(treeId);
    if (prev.includes(dismissKey)) return prev;
    const next = [dismissKey, ...prev].slice(0, 200);
    localStorage.setItem(key(treeId), JSON.stringify(next));
    return next;
  } catch {
    return getDismissedDiscoveryKeys(treeId);
  }
}

export function clearDismissedDiscoveries(treeId: number): string[] {
  try {
    localStorage.removeItem(key(treeId));
  } catch {
    /* ignore */
  }
  return [];
}
