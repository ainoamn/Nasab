import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import {
  classifyRelationPath,
  findRelationPath,
  type PathHop,
  type PathLabelKey,
} from "@/lib/relationPath";
import PersonSearchPicker from "@/components/tree/PersonSearchPicker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { GitCompareArrows, ChevronLeft, Link as LinkIcon, Copy } from "lucide-react";
import type { RecentRelatePair } from "@/lib/recentRelates";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  rels: Relationship[];
  defaultFromId?: number | null;
  defaultToId?: number | null;
  recentPairs?: RecentRelatePair[];
  onOpenPerson?: (person: Person) => void;
  /** عرض المسار على مخطط العائلة */
  onShowOnChart?: (pathIds: number[]) => void;
  /** نسخ رابط عميق للمسار */
  onCopyPathLink?: (fromId: number, toId: number) => void;
  /** نسخ نص المسار للواتساب */
  onCopyPathText?: (fromId: number, toId: number) => void;
  /** عند اختيار زوج من المقارنات الأخيرة */
  onSelectRecentPair?: (fromId: number, toId: number) => void;
};

function viaLabel(
  via: PathHop["via"],
  t: (k: string) => string,
): string | null {
  if (via === "start") return null;
  if (via === "parent") return t("tree.pathViaParent");
  if (via === "child") return t("tree.pathViaChild");
  return t("tree.pathViaSpouse");
}

function labelText(key: PathLabelKey, t: (k: string) => string) {
  return t(`tree.rel.${key}`);
}

/** أداة «كيف يرتبطان؟» — مسار القرابة بأسلوب مواقع النسب */
export default function RelationPathDialog({
  open,
  onOpenChange,
  people,
  rels,
  defaultFromId,
  defaultToId,
  recentPairs,
  onOpenPerson,
  onShowOnChart,
  onCopyPathLink,
  onCopyPathText,
  onSelectRecentPair,
}: Props) {
  const { t } = useTranslation();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");

  useEffect(() => {
    if (!open) return;
    if (defaultFromId != null) setFromId(String(defaultFromId));
    if (defaultToId != null) setToId(String(defaultToId));
  }, [open, defaultFromId, defaultToId]);

  const fromNum = fromId ? Number(fromId) : null;
  const toNum = toId ? Number(toId) : null;

  const path = useMemo(() => {
    if (fromNum == null || toNum == null || Number.isNaN(fromNum) || Number.isNaN(toNum)) {
      return null;
    }
    return findRelationPath(fromNum, toNum, people, rels);
  }, [fromNum, toNum, people, rels]);

  const label = useMemo(() => {
    if (fromNum == null || toNum == null) return null;
    return classifyRelationPath(fromNum, toNum, people, rels, path);
  }, [fromNum, toNum, people, rels, path]);

  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const recentChips = useMemo(() => {
    if (!recentPairs?.length) return [];
    return recentPairs
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
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .slice(0, 8);
  }, [recentPairs, byId, people, rels, t]);

  const swap = () => {
    setFromId(toId);
    setToId(fromId);
  };

  const pickRecent = (a: number, b: number) => {
    setFromId(String(a));
    setToId(String(b));
    onSelectRecentPair?.(a, b);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5 text-sky-600" />
            {t("tree.howRelatedTitle")}
          </DialogTitle>
          <DialogDescription>{t("tree.howRelatedHint")}</DialogDescription>
        </DialogHeader>

        {recentChips.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("tree.recentRelatesTitle")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recentChips.map((chip) => (
                <button
                  key={`${chip.a}-${chip.b}`}
                  type="button"
                  onClick={() => pickRecent(chip.a, chip.b)}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border bg-sky-50/80 px-2.5 py-1 text-[11px] font-medium text-sky-950 hover:bg-sky-100"
                  title={`${chip.aName} ↔ ${chip.bName}`}
                >
                  <span className="truncate">
                    {chip.aName} ↔ {chip.bName}
                  </span>
                  <span className="shrink-0 text-sky-700/70">· {chip.rel}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("tree.howRelatedFrom")}
            </p>
            <PersonSearchPicker
              people={people}
              value={fromId}
              onChange={setFromId}
              excludeId={toNum ?? undefined}
              placeholder={t("chart.searchInTree")}
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="mx-auto h-9 w-9 shrink-0"
            title={t("tree.howRelatedSwap")}
            onClick={swap}
          >
            <GitCompareArrows className="h-4 w-4" />
          </Button>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              {t("tree.howRelatedTo")}
            </p>
            <PersonSearchPicker
              people={people}
              value={toId}
              onChange={setToId}
              excludeId={fromNum ?? undefined}
              placeholder={t("chart.searchInTree")}
            />
          </div>
        </div>

        {fromNum != null && toNum != null && (
          <div className="mt-2 space-y-3 rounded-xl border bg-muted/30 p-3">
            {label && (
              <p className="text-center text-base font-semibold text-sky-900">
                {labelText(label, t)}
              </p>
            )}
            {path == null ? (
              <p className="text-center text-sm text-muted-foreground">
                {t("tree.howRelatedNone")}
              </p>
            ) : (
              <>
              <ol className="flex flex-col gap-1">
                {path.map((hop, i) => {
                  const person = byId.get(hop.personId);
                  if (!person) return null;
                  const edge = viaLabel(hop.via, t);
                  return (
                    <li key={`${hop.personId}-${i}`} className="flex flex-col items-stretch">
                      {edge && (
                        <div className="flex items-center gap-2 py-0.5 ps-4 text-[11px] text-muted-foreground">
                          <ChevronLeft className="h-3 w-3 rotate-[-90deg] opacity-60 rtl:rotate-90" />
                          <span>{edge}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        className={cn(
                          "flex items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-start text-sm hover:bg-sky-50",
                          i === 0 && "border-sky-300",
                          i === path.length - 1 && i !== 0 && "border-pink-300",
                        )}
                        onClick={() => onOpenPerson?.(person)}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 overflow-hidden rounded-full text-xs text-white",
                            person.gender === "female" ? "bg-pink-500" : "bg-sky-600",
                          )}
                        >
                          {person.photoUrl ? (
                            <img
                              src={person.photoUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center">
                              {person.givenName.slice(0, 1)}
                            </span>
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {person.givenName}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {onShowOnChart && path.length > 1 && (
                <Button
                  type="button"
                  className="w-full gap-2"
                  onClick={() => {
                    onShowOnChart(path.map((h) => h.personId));
                    onOpenChange(false);
                  }}
                >
                  <GitCompareArrows className="h-4 w-4" />
                  {t("tree.showPathOnChart")}
                </Button>
              )}
              {onCopyPathText && fromNum != null && toNum != null && path.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => onCopyPathText(fromNum, toNum)}
                >
                  <Copy className="h-4 w-4" />
                  {t("tree.copyPathText")}
                </Button>
              )}
              {onCopyPathLink && fromNum != null && toNum != null && path.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => onCopyPathLink(fromNum, toNum)}
                >
                  <LinkIcon className="h-4 w-4" />
                  {t("tree.copyPathLink")}
                </Button>
              )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
