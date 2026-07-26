export type OccasionsScope = "all" | "close" | "favorites";

const key = (treeId: number) => `nasab:occasionsScope:${treeId}`;
const shareKey = (token: string) => `nasab:occasionsScope:share:${token}`;

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

export function getShareOccasionsScope(token: string): OccasionsScope {
  try {
    const raw = localStorage.getItem(shareKey(token));
    if (raw === "close" || raw === "favorites" || raw === "all") return raw;
  } catch {
    /* ignore */
  }
  return "close";
}

export function setShareOccasionsScope(
  token: string,
  scope: OccasionsScope,
): OccasionsScope {
  try {
    localStorage.setItem(shareKey(token), scope);
  } catch {
    /* ignore */
  }
  return scope;
}
