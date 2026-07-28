import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import {
  classifyRelationPath,
  findRelationPath,
} from "@/lib/relationPath";
import type { FavoriteRelatePair } from "@/lib/favoriteRelates";
import { isTwin, twinGroupSize, twinOrderInGroup } from "@/lib/twins";
import TwinBadge from "@/components/tree/TwinBadge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Star, Eye, Printer, GitCompareArrows } from "lucide-react";

type Props = {
  people: Person[];
  rels: Relationship[];
  pairs: FavoriteRelatePair[];
  onOpenCompare: (aId: number, bId: number) => void;
  onShowPath: (pathIds: number[]) => void;
  onPrintCert?: (aId: number, bId: number) => void;
  className?: string;
};

/** شريط مقارنات القرابة المثبتة فوق مساحة العمل */
export default function FavoriteRelatesStrip({
  people,
  rels,
  pairs,
  onOpenCompare,
  onShowPath,
  onPrintCert,
  className,
}: Props) {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const chips = useMemo(() => {
    return pairs
      .map((pair) => {
        const a = byId.get(pair.a);
        const b = byId.get(pair.b);
        if (!a || !b) return null;
        const hops = findRelationPath(pair.a, pair.b, people, rels);
        const key = classifyRelationPath(pair.a, pair.b, people, rels, hops);
        return {
          a: pair.a,
          b: pair.b,
          aPerson: a,
          bPerson: b,
          aName: a.givenName,
          bName: b.givenName,
          aTwin: isTwin(a, people),
          bTwin: isTwin(b, people),
          rel: t(`tree.rel.${key}`),
          hops: hops?.map((h) => h.personId) ?? [],
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .slice(0, 12);
  }, [pairs, byId, people, rels, t]);

  if (chips.length === 0) return null;

  return (
    <div className={cn("mb-4", className)}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <GitCompareArrows className="h-3.5 w-3.5 text-amber-600" />
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
        {t("tree.favoriteRelatesTitle")}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {chips.map((chip) => (
          <div
            key={`${chip.a}-${chip.b}`}
            className="flex shrink-0 items-center gap-0.5 rounded-xl border border-amber-200 bg-amber-50/70 pe-1 shadow-sm"
          >
            <button
              type="button"
              onClick={() => onOpenCompare(chip.a, chip.b)}
              className="max-w-[14rem] truncate px-2.5 py-1.5 text-start text-[11px] font-semibold text-amber-950 hover:bg-amber-100/80"
              title={`${chip.aName} ↔ ${chip.bName} ${t("common.emDash")} ${chip.rel}`}
            >
              <span className="inline-flex items-center gap-0.5">
                {chip.aName}
                {chip.aTwin ? (
                  <TwinBadge
                    compact
                    order={twinOrderInGroup(chip.aPerson, people)}
                    total={twinGroupSize(chip.aPerson, people)}
                  />
                ) : null}
              </span>
              {" ↔ "}
              <span className="inline-flex items-center gap-0.5">
                {chip.bName}
                {chip.bTwin ? (
                  <TwinBadge
                    compact
                    order={twinOrderInGroup(chip.bPerson, people)}
                    total={twinGroupSize(chip.bPerson, people)}
                  />
                ) : null}
              </span>
              <span className="ms-1 font-normal text-amber-800/70">
                · {chip.rel}
              </span>
            </button>
            {chip.hops.length > 1 && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={t("tree.showPathOnChart")}
                aria-label={t("tree.showPathOnChart")}
                onClick={() => onShowPath(chip.hops)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
            {onPrintCert && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={t("tree.printKinshipCert")}
                aria-label={t("tree.printKinshipCert")}
                onClick={() => onPrintCert(chip.a, chip.b)}
              >
                <Printer className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
