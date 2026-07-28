import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import {
  classifyRelationPath,
  findRelationPath,
} from "@/lib/relationPath";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { House, Eye, ChevronLeft, Link as LinkIcon, Copy } from "lucide-react";
import { isTwin, twinGroupSize, twinOrderInGroup } from "@/lib/twins";
import TwinBadge from "@/components/tree/TwinBadge";

type Props = {
  homePerson: Person;
  detailPerson: Person;
  people: Person[];
  rels: Relationship[];
  onSelectHop: (person: Person) => void;
  onHighlightPath: (pathIds: number[]) => void;
  onCopyPathLink?: () => void;
  onCopyPathText?: () => void;
  className?: string;
};

/** مسار من شخص البيت إلى الملف الحالي — hops قابلة للنقر + إبراز على المخطط */
export default function PathToHomeStrip({
  homePerson,
  detailPerson,
  people,
  rels,
  onSelectHop,
  onHighlightPath,
  onCopyPathLink,
  onCopyPathText,
  className,
}: Props) {
  const { t } = useTranslation();

  const { path, label } = useMemo(() => {
    if (homePerson.id === detailPerson.id) {
      return { path: null, label: null as string | null };
    }
    const hops = findRelationPath(
      homePerson.id,
      detailPerson.id,
      people,
      rels,
    );
    const key = classifyRelationPath(
      homePerson.id,
      detailPerson.id,
      people,
      rels,
      hops,
    );
    return {
      path: hops,
      label: t(`tree.rel.${key}`),
    };
  }, [homePerson, detailPerson, people, rels, t]);

  if (!path || path.length < 2) return null;

  const byId = new Map(people.map((p) => [p.id, p]));

  return (
    <div
      className={cn(
        "rounded-xl border border-sky-200/80 bg-sky-50/60 px-3 py-2.5",
        className,
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-sky-950">
          {t("detail.pathToHome")}
          {label && (
            <span className="ms-1.5 font-normal text-sky-800/80">
              {t("common.emDash")} {label}
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            onClick={() => onHighlightPath(path.map((h) => h.personId))}
          >
            <Eye className="h-3 w-3" />
            {t("tree.showPathOnChart")}
          </Button>
          {onCopyPathText && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={onCopyPathText}
            >
              <Copy className="h-3 w-3" />
              {t("tree.copyPathText")}
            </Button>
          )}
          {onCopyPathLink && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              onClick={onCopyPathLink}
            >
              <LinkIcon className="h-3 w-3" />
              {t("tree.copyPathLink")}
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        {path.map((hop, i) => {
          const p = byId.get(hop.personId);
          if (!p) return null;
          const isHome = p.id === homePerson.id;
          const isEnd = p.id === detailPerson.id;
          return (
            <span key={`${hop.personId}-${i}`} className="inline-flex items-center gap-0.5">
              {i > 0 && (
                <ChevronLeft className="mx-0.5 h-3 w-3 shrink-0 text-sky-400 rtl:rotate-180" />
              )}
              <button
                type="button"
                onClick={() => onSelectHop(p)}
                className={cn(
                  "inline-flex max-w-[7.5rem] items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-medium transition hover:bg-white",
                  isEnd
                    ? "bg-sky-600 text-white"
                    : isHome
                      ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300"
                      : "bg-white/80 text-sky-950 ring-1 ring-sky-200",
                )}
                title={p.givenName}
              >
                {isHome && <House className="h-3 w-3 shrink-0" />}
                <span className="truncate">{p.givenName}</span>
                {isTwin(p, people) ? (
                  <TwinBadge
                    compact
                    order={twinOrderInGroup(p, people)}
                    total={twinGroupSize(p, people)}
                  />
                ) : null}
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
