import type { OccasionsScope } from "@/lib/occasionsScope";

export type ResearchTourScope = OccasionsScope;

type TourState = {
  scope: ResearchTourScope;
  index: number;
};

const key = (treeId: number) => `nasab:researchTour:${treeId}`;

export function getResearchTourState(treeId: number): TourState {
  try {
    const raw = localStorage.getItem(key(treeId));
    if (!raw) return { scope: "close", index: 0 };
    const parsed = JSON.parse(raw) as Partial<TourState>;
    const scope =
      parsed.scope === "close" ||
      parsed.scope === "favorites" ||
      parsed.scope === "all"
        ? parsed.scope
        : "close";
    const index =
      typeof parsed.index === "number" &&
      Number.isFinite(parsed.index) &&
      parsed.index >= 0
        ? Math.floor(parsed.index)
        : 0;
    return { scope, index };
  } catch {
    return { scope: "close", index: 0 };
  }
}

export function setResearchTourState(
  treeId: number,
  state: TourState,
): TourState {
  try {
    localStorage.setItem(
      key(treeId),
      JSON.stringify({
        scope: state.scope,
        index: Math.max(0, Math.floor(state.index)),
      }),
    );
  } catch {
    /* ignore */
  }
  return state;
}
