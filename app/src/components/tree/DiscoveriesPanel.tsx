import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import {
  findDiscoveries,
  sortDiscoveriesByProximity,
  type Discovery,
} from "@/lib/discoveries";
import {
  discoveryDismissKey,
} from "@/lib/dismissedDiscoveries";
import {
  AlertTriangle,
  UserRoundPlus,
  Camera,
  GitCompareArrows,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  people: Person[];
  rels: Relationship[];
  canWrite?: boolean;
  homePersonId?: number | null;
  favoriteIds?: number[];
  recentIds?: number[];
  dismissedKeys?: string[];
  onDismiss?: (key: string) => void;
  onClearDismissed?: () => void;
  onOpenPerson: (personId: number) => void;
  onAddParent?: (personId: number, role: "father" | "mother") => void;
  onComparePair?: (aId: number, bId: number) => void;
  onHighlightPair?: (aId: number, bId: number) => void;
  className?: string;
};

function iconFor(kind: Discovery["kind"]) {
  if (kind === "noPhoto") return Camera;
  if (kind === "deathBeforeBirth" || kind === "childBeforeParent") return AlertTriangle;
  if (kind === "possibleDuplicate" || kind === "livingNoBirthYear") return AlertTriangle;
  if (kind.startsWith("missing") || kind === "childNoSpouseLink") return UserRoundPlus;
  return AlertTriangle;
}

function rowKey(d: Discovery) {
  return discoveryDismissKey(d.kind, d.personId, d.otherPersonId);
}

/** لوحة اكتشافات: آباء ناقصون، صور ناقصة، … مع إخفاء وترتيب شخصي */
export default function DiscoveriesPanel({
  people,
  rels,
  canWrite,
  homePersonId = null,
  favoriteIds = [],
  recentIds = [],
  dismissedKeys = [],
  onDismiss,
  onClearDismissed,
  onOpenPerson,
  onAddParent,
  onComparePair,
  onHighlightPair,
  className,
}: Props) {
  const { t } = useTranslation();
  const [showDismissed, setShowDismissed] = useState(false);
  const dismissed = useMemo(() => new Set(dismissedKeys), [dismissedKeys]);

  const allItems = useMemo(
    () => findDiscoveries(people, rels, { includeNoPhoto: false, limit: 40 }),
    [people, rels],
  );

  const ranked = useMemo(
    () =>
      sortDiscoveriesByProximity(allItems, {
        homeId: homePersonId,
        favoriteIds,
        recentIds,
      }),
    [allItems, homePersonId, favoriteIds, recentIds],
  );

  const visible = useMemo(() => {
    const filtered = showDismissed
      ? ranked
      : ranked.filter((d) => !dismissed.has(rowKey(d)));
    return filtered.slice(0, 12);
  }, [ranked, dismissed, showDismissed]);

  const hiddenCount = ranked.filter((d) => dismissed.has(rowKey(d))).length;

  if (ranked.length === 0) return null;
  if (visible.length === 0 && hiddenCount === 0) return null;

  return (
    <div
      className={cn(
        "mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3 sm:p-4",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <p className="text-sm font-semibold text-amber-950">
          {t("tree.discoveriesTitle")}
        </p>
        <span className="text-[11px] text-amber-800/80">
          {t("tree.discoveriesCount", { count: visible.length })}
        </span>
        {hiddenCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ms-auto h-7 text-xs text-amber-900"
            onClick={() => setShowDismissed((v) => !v)}
          >
            {showDismissed
              ? t("tree.discoveriesHideDismissed")
              : t("tree.discoveriesShowDismissed", { count: hiddenCount })}
          </Button>
        )}
        {showDismissed && hiddenCount > 0 && onClearDismissed && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={onClearDismissed}
          >
            {t("tree.discoveriesClearDismissed")}
          </Button>
        )}
      </div>
      {visible.length === 0 ? (
        <p className="text-xs text-amber-900/70">{t("tree.discoveriesAllHidden")}</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((d) => {
            const Icon = iconFor(d.kind);
            const dk = rowKey(d);
            const isHidden = dismissed.has(dk);
            return (
              <li
                key={dk}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-white/80 px-3 py-2",
                  isHidden && "opacity-60",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start text-sm font-medium underline-offset-2 hover:underline"
                  onClick={() => onOpenPerson(d.personId)}
                >
                  {d.personName}
                  <span className="ms-1 font-normal text-muted-foreground">
                    — {t(`tree.discovery.${d.kind}`)}
                    {d.otherPersonName ? ` (${d.otherPersonName})` : ""}
                  </span>
                </button>
                {d.kind === "possibleDuplicate" && d.otherPersonId != null && (
                  <>
                    {onComparePair && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() => onComparePair(d.personId, d.otherPersonId!)}
                      >
                        <GitCompareArrows className="h-3 w-3" />
                        {t("tree.discoveryCompare")}
                      </Button>
                    )}
                    {onHighlightPair && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-xs"
                        onClick={() =>
                          onHighlightPair(d.personId, d.otherPersonId!)
                        }
                      >
                        <Eye className="h-3 w-3" />
                        {t("tree.discoveryShowPath")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => onOpenPerson(d.otherPersonId!)}
                    >
                      {t("tree.discoveryOpenOther")}
                    </Button>
                  </>
                )}
                {canWrite && d.kind === "missingFather" && onAddParent && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onAddParent(d.personId, "father")}
                  >
                    {t("chart.addFather")}
                  </Button>
                )}
                {canWrite && d.kind === "missingMother" && onAddParent && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onAddParent(d.personId, "mother")}
                  >
                    {t("chart.addMother")}
                  </Button>
                )}
                {canWrite && d.kind === "missingBothParents" && onAddParent && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onAddParent(d.personId, "father")}
                  >
                    {t("chart.addFather")}
                  </Button>
                )}
                {onDismiss && !isHidden && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground"
                    title={t("tree.discoveryDismiss")}
                    onClick={() => onDismiss(dk)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
