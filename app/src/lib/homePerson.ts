const key = (treeId: number) => `nasab:homePerson:${treeId}`;

export function getHomePersonId(treeId: number): number | null {
  try {
    const raw = localStorage.getItem(key(treeId));
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function setHomePersonId(treeId: number, personId: number | null) {
  try {
    if (personId == null) localStorage.removeItem(key(treeId));
    else localStorage.setItem(key(treeId), String(personId));
  } catch {
    /* ignore */
  }
}
