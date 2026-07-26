import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Person } from "@db/tables";
import type { PersonGap } from "@/lib/personGaps";
import {
  buildResearchTourItems,
  type ResearchTourItem,
} from "@/lib/researchTour";
import {
  getResearchTourState,
  setResearchTourState,
  type ResearchTourScope,
} from "@/lib/researchTourState";
import OccasionsScopeChips from "@/components/tree/OccasionsScopeChips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Network,
  Wrench,
  X,
} from "lucide-react";

type Props = {
  treeId: number;
  gapsById: Map<number, PersonGap[]>;
  peopleById: Map<number, Person>;
  dismissedKeys: string[];
  homePersonId?: number | null;
  favoriteIds?: number[];
  recentIds?: number[];
  /** مجموعة الأشخاص المسموح بهم حسب النطاق (null = الكل) */
  allowedPersonIds?: Set<number> | null;
  scope: ResearchTourScope;
  onScopeChange: (scope: ResearchTourScope) => void;
  canWrite?: boolean;
  onFix: (person: Person, kind: PersonGap["kind"]) => void;
  onShow: (person: Person) => void;
  onSkip: (key: string) => void;
  className?: string;
};

/** شريط جولة البحث: نطاق + استئناف + التالي / إصلاح / إظهار / تخطّي */
export default function ResearchTourStrip({
  treeId,
  gapsById,
  peopleById,
  dismissedKeys,
  homePersonId = null,
  favoriteIds = [],
  recentIds = [],
  allowedPersonIds = null,
  scope,
  onScopeChange,
  canWrite,
  onFix,
  onShow,
  onSkip,
  className,
}: Props) {
  const { t } = useTranslation();
  const items = useMemo(
    () =>
      buildResearchTourItems(gapsById, peopleById, dismissedKeys, {
        homeId: homePersonId,
        favoriteIds,
        recentIds,
        allowedPersonIds,
      }),
    [
      gapsById,
      peopleById,
      dismissedKeys,
      homePersonId,
      favoriteIds,
      recentIds,
      allowedPersonIds,
    ],
  );
  const [index, setIndex] = useState(() => getResearchTourState(treeId).index);

  useEffect(() => {
    setIndex(getResearchTourState(treeId).index);
  }, [treeId]);

  useEffect(() => {
    if (items.length === 0) return;
    if (index >= items.length) {
      const next = Math.max(0, items.length - 1);
      setIndex(next);
      setResearchTourState(treeId, { scope, index: next });
    }
  }, [items.length, index, treeId, scope]);

  const persistIndex = (next: number) => {
    setIndex(next);
    setResearchTourState(treeId, { scope, index: next });
  };

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "mb-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/40 px-3 py-2",
          className,
        )}
        data-research-tour
      >
        <OccasionsScopeChips
          value={scope}
          labelKey="tree.researchTourScopeLabel"
          onChange={(s) => {
            onScopeChange(s);
            setResearchTourState(treeId, { scope: s, index: 0 });
            setIndex(0);
          }}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("tree.researchTourEmptyScope")}
        </p>
      </div>
    );
  }

  const current: ResearchTourItem = items[Math.min(index, items.length - 1)]!;
  const person = peopleById.get(current.personId);
  if (!person) return null;

  const goNext = () => persistIndex((index + 1) % items.length);
  const goPrev = () =>
    persistIndex((index - 1 + items.length) % items.length);

  return (
    <div
      className={cn(
        "mb-3 space-y-2 rounded-xl border border-amber-300/80 bg-amber-50/70 px-3 py-2 text-sm",
        className,
      )}
      data-research-tour
    >
      <OccasionsScopeChips
        value={scope}
        labelKey="tree.researchTourScopeLabel"
        onChange={(s) => {
          onScopeChange(s);
          setResearchTourState(treeId, { scope: s, index: 0 });
          setIndex(0);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
        <span className="text-[11px] font-semibold text-amber-900">
          {t("tree.researchTourProgress", {
            current: Math.min(index, items.length - 1) + 1,
            total: items.length,
          })}
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-start font-medium text-amber-950 underline-offset-2 hover:underline"
          onClick={() => onShow(person)}
        >
          {current.personName}
          <span className="ms-1 font-normal text-amber-900/75">
            — {t(`detail.gap.${current.kind}`)}
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title={t("tree.researchTourPrev")}
            onClick={goPrev}
          >
            <ChevronRight className="h-3.5 w-3.5 rtl:hidden" />
            <ChevronLeft className="hidden h-3.5 w-3.5 rtl:block" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title={t("tree.researchTourNext")}
            data-research-next
            onClick={goNext}
          >
            <ChevronLeft className="h-3.5 w-3.5 rtl:hidden" />
            <ChevronRight className="hidden h-3.5 w-3.5 rtl:block" />
          </Button>
          {canWrite && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 gap-1 text-xs"
              onClick={() => onFix(person, current.kind)}
            >
              <Wrench className="h-3 w-3" />
              {t("tree.growthFix")}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => onShow(person)}
          >
            <Network className="h-3 w-3" />
            {t("detail.showOnChart")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-xs"
            title={t("tree.researchTourSkip")}
            onClick={() => {
              onSkip(current.key);
              goNext();
            }}
          >
            <X className="h-3 w-3" />
            {t("tree.researchTourSkip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
