/** مزامنة روابط الشجرة العميقة: ?person=&view=&tab= و ?root= للطباعة */

export type ChartViewParam =
  | "family"
  | "close"
  | "pedigree"
  | "fan"
  | "descendants";

const CHART_VIEWS = new Set<string>([
  "family",
  "close",
  "pedigree",
  "fan",
  "descendants",
]);

const MAIN_TABS = new Set([
  "chart",
  "list",
  "places",
  "occasions",
  "photos",
  "log",
]);

export function parsePersonIdParam(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export function parseChartViewParam(raw: string | null): ChartViewParam | null {
  if (raw == null || !CHART_VIEWS.has(raw)) return null;
  return raw as ChartViewParam;
}

export function parseMainTabParam(raw: string | null): string | null {
  if (raw == null || !MAIN_TABS.has(raw)) return null;
  return raw;
}

export function buildTreePersonPath(
  treeId: number,
  personId: number,
  opts?: { view?: ChartViewParam; tab?: string },
): string {
  const q = new URLSearchParams();
  q.set("person", String(personId));
  if (opts?.view && opts.view !== "family") q.set("view", opts.view);
  if (opts?.tab && opts.tab !== "chart") q.set("tab", opts.tab);
  return `/trees/${treeId}?${q.toString()}`;
}

export function buildSharePersonPath(shareToken: string, personId: number): string {
  return `/share/${shareToken}?person=${personId}`;
}

export function buildPrintRootPath(
  treeId: number,
  rootPersonId: number,
  opts?: { template?: string },
): string {
  const q = new URLSearchParams();
  q.set("root", String(rootPersonId));
  if (opts?.template) q.set("template", opts.template);
  return `/trees/${treeId}/print?${q.toString()}`;
}

export function buildPrintTemplatePath(
  treeId: number,
  template: string,
): string {
  return `/trees/${treeId}/print?template=${encodeURIComponent(template)}`;
}

export function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}
