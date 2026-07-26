import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import {
  classifyRelationPath,
  findRelationPath,
} from "@/lib/relationPath";
import type { RecentRelatePair } from "@/lib/recentRelates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { History, Eye, Printer, Star, GitCompareArrows } from "lucide-react";

type Props = {
  people: Person[];
  rels: Relationship[];
  pairs: RecentRelatePair[];
  onOpenCompare: (aId: number, bId: number) => void;
  onShowPath: (pathIds: number[]) => void;
  onPrintCert?: (aId: number, bId: number) => void;
  onPin?: (aId: number, bId: number) => void;
  className?: string;
};

/** شريط مقارنات القرابة الأخيرة فوق مساحة العمل */
export default function RecentRelatesStrip({
  people,
  rels,
  pairs,
  onOpenCompare,
  onShowPath,
  onPrintCert,
  onPin,
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
          aName: a.givenName,
          bName: b.givenName,
          rel: t(`tree.rel.${key}`),
          hops: hops?.map((h) => h.personId) ?? [],
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .slice(0, 8);
  }, [pairs, byId, people, rels, t]);

  if (chips.length === 0) return null;

  return (
    <div className={cn("mb-4", className)}>
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <GitCompareArrows className="h-3.5 w-3.5 text-sky-600" />
        <History className="h-3.5 w-3.5" />
        {t("tree.recentRelatesTitle")}
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {chips.map((chip) => (
          <div
            key={`${chip.a}-${chip.b}`}
            className="flex shrink-0 items-center gap-0.5 rounded-xl border border-sky-200 bg-sky-50/70 pe-1 shadow-sm"
          >
            <button
              type="button"
              onClick={() => onOpenCompare(chip.a, chip.b)}
              className="max-w-[11rem] truncate px-2.5 py-1.5 text-start text-[11px] font-semibold text-sky-950 hover:bg-sky-100/80"
              title={`${chip.aName} ↔ ${chip.bName} — ${chip.rel}`}
            >
              {chip.aName} ↔ {chip.bName}
              <span className="ms-1 font-normal text-sky-800/70">
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
                onClick={() => onPrintCert(chip.a, chip.b)}
              >
                <Printer className="h-3 w-3" />
              </Button>
            )}
            {onPin && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                title={t("tree.favoriteRelate")}
                onClick={() => onPin(chip.a, chip.b)}
              >
                <Star className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
