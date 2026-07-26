export type OccasionsScope = "all" | "close" | "favorites";

const key = (treeId: number) => `nasab:occasionsScope:${treeId}`;

export function getOccasionsScope(treeId: number): OccasionsScope {
  try {
    const raw = localStorage.getItem(key(treeId));
    if (raw === "close" || raw === "favorites" || raw === "all") return raw;
  } catch {
    /* ignore */
  }
  return "close";
}

export function setOccasionsScope(
  treeId: number,
  scope: OccasionsScope,
): OccasionsScope {
  try {
    localStorage.setItem(key(treeId), scope);
  } catch {
    /* ignore */
  }
  return scope;
}
