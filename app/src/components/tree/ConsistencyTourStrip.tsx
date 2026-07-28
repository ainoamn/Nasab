import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { findDiscoveries } from "@/lib/discoveries";
import {
  buildConsistencyTourItems,
  type ConsistencyTourItem,
} from "@/lib/consistencyTour";
import {
  getConsistencyTourState,
  setConsistencyTourState,
  type ConsistencyTourScope,
} from "@/lib/consistencyTourState";
import OccasionsScopeChips from "@/components/tree/OccasionsScopeChips";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  GitCompareArrows,
  Network,
  X,
} from "lucide-react";
import { isTwin, twinGroupSize, twinOrderInGroup } from "@/lib/twins";
import TwinBadge from "@/components/tree/TwinBadge";

type Props = {
  treeId: number;
  people: Person[];
  rels: Relationship[];
  dismissedKeys: string[];
  homePersonId?: number | null;
  favoriteIds?: number[];
  recentIds?: number[];
  allowedPersonIds?: Set<number> | null;
  scope: ConsistencyTourScope;
  onScopeChange: (scope: ConsistencyTourScope) => void;
  onShow: (person: Person) => void;
  onCompare?: (aId: number, bId: number) => void;
  onSkip: (key: string) => void;
  className?: string;
};

/** جولة فحص الاتساق: تواريخ متناقضة / تكرار محتمل / … */
export default function ConsistencyTourStrip({
  treeId,
  people,
  rels,
  dismissedKeys,
  homePersonId = null,
  favoriteIds = [],
  recentIds = [],
  allowedPersonIds = null,
  scope,
  onScopeChange,
  onShow,
  onCompare,
  onSkip,
  className,
}: Props) {
  const { t } = useTranslation();
  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );

  const items = useMemo(() => {
    const discoveries = findDiscoveries(people, rels, {
      includeNoPhoto: false,
      limit: 60,
    });
    return buildConsistencyTourItems(discoveries, dismissedKeys, {
      homeId: homePersonId,
      favoriteIds,
      recentIds,
      allowedPersonIds,
    });
  }, [
    people,
    rels,
    dismissedKeys,
    homePersonId,
    favoriteIds,
    recentIds,
    allowedPersonIds,
  ]);

  const [index, setIndex] = useState(
    () => getConsistencyTourState(treeId).index,
  );

  useEffect(() => {
    setIndex(getConsistencyTourState(treeId).index);
  }, [treeId]);

  useEffect(() => {
    if (items.length === 0) return;
    if (index >= items.length) {
      const next = Math.max(0, items.length - 1);
      setIndex(next);
      setConsistencyTourState(treeId, { scope, index: next });
    }
  }, [items.length, index, treeId, scope]);

  const persistIndex = (next: number) => {
    setIndex(next);
    setConsistencyTourState(treeId, { scope, index: next });
  };

  if (items.length === 0) {
    return (
      <div
        className={cn(
          "mb-3 rounded-xl border border-dashed border-rose-200 bg-rose-50/40 px-3 py-2",
          className,
        )}
        data-consistency-tour
      >
        <OccasionsScopeChips
          value={scope}
          labelKey="tree.consistencyTourScopeLabel"
          onChange={(s) => {
            onScopeChange(s);
            setConsistencyTourState(treeId, { scope: s, index: 0 });
            setIndex(0);
          }}
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("tree.consistencyTourEmpty")}
        </p>
      </div>
    );
  }

  const current: ConsistencyTourItem =
    items[Math.min(index, items.length - 1)]!;
  const person = peopleById.get(current.personId);
  if (!person) return null;

  const goNext = () => persistIndex((index + 1) % items.length);
  const goPrev = () =>
    persistIndex((index - 1 + items.length) % items.length);

  return (
    <div
      className={cn(
        "mb-3 space-y-2 rounded-xl border border-rose-300/80 bg-rose-50/70 px-3 py-2 text-sm",
        className,
      )}
      data-consistency-tour
    >
      <OccasionsScopeChips
        value={scope}
        labelKey="tree.consistencyTourScopeLabel"
        onChange={(s) => {
          onScopeChange(s);
          setConsistencyTourState(treeId, { scope: s, index: 0 });
          setIndex(0);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-700" />
        <span className="text-[11px] font-semibold text-rose-900">
          {t("tree.consistencyTourProgress", {
            current: Math.min(index, items.length - 1) + 1,
            total: items.length,
          })}
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-start font-medium text-rose-950 underline-offset-2 hover:underline"
          onClick={() => onShow(person)}
        >
          <span className="inline-flex max-w-full flex-wrap items-center gap-1">
            <span className="truncate">{current.personName}</span>
            {isTwin(person, people) ? (
              <TwinBadge
                compact
                order={twinOrderInGroup(person, people)}
                total={twinGroupSize(person, people)}
              />
            ) : null}
            {current.otherPersonName ? (
              <>
                <span>×</span>
                <span className="truncate">{current.otherPersonName}</span>
                {(() => {
                  const other =
                    current.otherPersonId != null
                      ? people.find((p) => p.id === current.otherPersonId)
                      : undefined;
                  return other && isTwin(other, people) ? (
                    <TwinBadge
                      compact
                      order={twinOrderInGroup(other, people)}
                      total={twinGroupSize(other, people)}
                    />
                  ) : null;
                })()}
              </>
            ) : null}
            <span className="font-normal text-rose-900/75">
              {t("common.emDash")} {t(`tree.discovery.${current.kind}`)}
            </span>
          </span>
        </button>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title={t("tree.researchTourPrev")}
            aria-label={t("tree.researchTourPrev")}
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
            aria-label={t("tree.researchTourNext")}
            data-consistency-next
            onClick={goNext}
          >
            <ChevronLeft className="h-3.5 w-3.5 rtl:hidden" />
            <ChevronRight className="hidden h-3.5 w-3.5 rtl:block" />
          </Button>
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
          {current.kind === "possibleDuplicate" &&
            current.otherPersonId != null &&
            onCompare && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-7 gap-1 text-xs"
                onClick={() =>
                  onCompare(current.personId, current.otherPersonId!)
                }
              >
                <GitCompareArrows className="h-3 w-3" />
                {t("tree.howRelatedTitle")}
              </Button>
            )}
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
