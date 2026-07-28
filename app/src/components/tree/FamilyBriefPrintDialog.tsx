import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { TreeOccasion } from "@/lib/treeOccasions";
import { formatBirthYear } from "@/lib/printData";
import { PrintableDocumentShell } from "@/components/PrintableDocumentShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Cake, Heart, Flower2 } from "lucide-react";
import { cn } from "@/lib/utils";

type BriefItem = {
  occasion: TreeOccasion;
  url: string | null;
};

type ResearchItem = {
  name: string;
  gapLabel: string;
  url: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  today: BriefItem[];
  week: BriefItem[];
  researchItems?: ResearchItem[];
  researchCount?: number;
  treeName?: string;
};

function KindIcon({ kind }: { kind: TreeOccasion["kind"] }) {
  if (kind === "memorial") return <Flower2 className="h-4 w-4" />;
  if (kind === "anniversary") return <Heart className="h-4 w-4" />;
  return <Cake className="h-4 w-4" />;
}

/** ورقة ملخص العائلة للطباعة — اليوم + الأسبوع + أولويات البحث */
export default function FamilyBriefPrintDialog({
  open,
  onOpenChange,
  today,
  week,
  researchItems = [],
  researchCount = 0,
  treeName,
}: Props) {
  const { t } = useTranslation();

  const kindLabel = (kind: TreeOccasion["kind"]) => {
    if (kind === "birthday") return t("tree.eventBirthday");
    if (kind === "memorial") return t("tree.eventMemorial");
    return t("tree.eventAnniversary");
  };

  const title = useMemo(
    () => `${t("tree.familyBriefTitle")}${treeName ? ` · ${treeName}` : ""}`,
    [t, treeName],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="no-print">
          <DialogTitle>{t("tree.familyBriefPrintTitle")}</DialogTitle>
          <DialogDescription>{t("tree.familyBriefPrintHint")}</DialogDescription>
        </DialogHeader>

        <PrintableDocumentShell title={title}>
          <article className="space-y-5" dir="auto">
            <header className="space-y-1 border-b pb-3 text-center">
              <p className="text-xs text-muted-foreground">{t("brand")}</p>
              <h1 className="font-display text-xl font-bold">{title}</h1>
              {treeName && (
                <p className="text-sm text-muted-foreground">{treeName}</p>
              )}
            </header>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">
                {t("tree.familyBriefToday")}
              </h2>
              {today.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("tree.familyBriefEmptyToday")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {today.map(({ occasion: ev, url }) => (
                    <li
                      key={ev.key}
                      className="flex items-start gap-2 rounded-lg border px-2.5 py-2"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          ev.kind === "memorial"
                            ? "bg-stone-100 text-stone-700"
                            : ev.kind === "anniversary"
                              ? "bg-pink-100 text-pink-700"
                              : "bg-sky-100 text-sky-700",
                        )}
                      >
                        <KindIcon kind={ev.kind} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{ev.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {kindLabel(ev.kind)} · {t("tree.eventToday")}
                          {ev.person && formatBirthYear(ev.person)
                            ? ` · ${formatBirthYear(ev.person)}`
                            : ""}
                        </p>
                        {url && (
                          <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">
                            {url}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">
                {t("tree.familyBriefWeek")}
              </h2>
              {week.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("tree.familyBriefEmptyWeek")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {week.map(({ occasion: ev, url }) => (
                    <li
                      key={ev.key}
                      className="flex items-start gap-2 rounded-lg border px-2.5 py-2"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                          ev.kind === "memorial"
                            ? "bg-stone-100 text-stone-700"
                            : ev.kind === "anniversary"
                              ? "bg-pink-100 text-pink-700"
                              : "bg-sky-100 text-sky-700",
                        )}
                      >
                        <KindIcon kind={ev.kind} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{ev.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {kindLabel(ev.kind)} ·{" "}
                          {t("tree.eventInDays", { n: ev.daysUntil })}
                        </p>
                        {url && (
                          <p className="mt-0.5 break-all font-mono text-[10px] text-muted-foreground">
                            {url}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {researchItems.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold">
                  {t("tree.familyBriefResearchHeader")}
                </h2>
                <ul className="space-y-1.5">
                  {researchItems.map((item, i) => (
                    <li key={`${item.name}-${i}`} className="text-sm">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {` ${t("common.emDash")} `}
                        {item.gapLabel}
                      </span>
                      {item.url && (
                        <p className="break-all font-mono text-[10px] text-muted-foreground">
                          {item.url}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                {researchCount > researchItems.length && (
                  <p className="text-xs text-muted-foreground">
                    {t("tree.familyBriefResearch", { count: researchCount })}
                  </p>
                )}
              </section>
            )}

            <footer className="border-t pt-3 text-center text-[11px] text-muted-foreground">
              {t("tree.familyBriefPrintFooter")}
            </footer>
          </article>
        </PrintableDocumentShell>
      </DialogContent>
    </Dialog>
  );
}
