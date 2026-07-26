import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import type { TreeOccasion } from "@/lib/treeOccasions";
import {
  classifyRelationPath,
  findRelationPath,
} from "@/lib/relationPath";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  occasion: TreeOccasion | null;
  people: Person[];
  rels: Relationship[];
  homePersonId?: number | null;
  personUrl: string;
  treeName?: string;
};

/** بطاقة مناسبة قابلة للطباعة — ميلاد / زواج / ذكرى */
export default function OccasionCardPrintDialog({
  open,
  onOpenChange,
  occasion,
  people,
  rels,
  homePersonId = null,
  personUrl,
  treeName,
}: Props) {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const sheet = useMemo(() => {
    if (!occasion?.person) return null;
    const person = occasion.person;
    let homeKin: string | null = null;
    if (homePersonId != null && homePersonId !== person.id) {
      const hops = findRelationPath(homePersonId, person.id, people, rels);
      const key = classifyRelationPath(
        homePersonId,
        person.id,
        people,
        rels,
        hops,
      );
      homeKin = t(`tree.rel.${key}`);
    }
    const kindLabel =
      occasion.kind === "birthday"
        ? t("tree.eventBirthday")
        : occasion.kind === "memorial"
          ? t("tree.eventMemorial")
          : t("tree.eventAnniversary");
    return {
      person,
      years: formatBirthYear(person),
      homeKin,
      kindLabel,
      dateLabel: `${occasion.day}/${occasion.month}`,
      secondary: occasion.secondaryPerson
        ? byId.get(occasion.secondaryPerson.id) ?? occasion.secondaryPerson
        : null,
    };
  }, [occasion, people, rels, homePersonId, byId, t]);

  const Icon =
    occasion?.kind === "memorial"
      ? Flower2
      : occasion?.kind === "anniversary"
        ? Heart
        : Cake;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader className="no-print">
          <DialogTitle>{t("tree.occasionCardTitle")}</DialogTitle>
          <DialogDescription>{t("tree.occasionCardHint")}</DialogDescription>
        </DialogHeader>

        {!sheet ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <PrintableDocumentShell
            title={`${sheet.kindLabel} — ${sheet.person.givenName}`}
          >
            <article className="space-y-4 text-center" dir="auto">
              <header className="space-y-2 border-b pb-4">
                <p className="text-xs text-muted-foreground">
                  {t("brand")}
                  {treeName ? ` · ${treeName}` : ""}
                </p>
                <span
                  className={cn(
                    "mx-auto flex h-12 w-12 items-center justify-center rounded-full",
                    occasion?.kind === "memorial"
                      ? "bg-stone-100 text-stone-700"
                      : occasion?.kind === "anniversary"
                        ? "bg-pink-100 text-pink-700"
                        : "bg-sky-100 text-sky-700",
                  )}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <p className="text-sm font-semibold text-muted-foreground">
                  {sheet.kindLabel}
                </p>
                <h1 className="font-display text-2xl font-bold">
                  {sheet.person.givenName}
                  {sheet.secondary ? ` × ${sheet.secondary.givenName}` : ""}
                </h1>
                <p className="text-base font-medium">{sheet.dateLabel}</p>
                {sheet.years && (
                  <p className="text-sm text-muted-foreground">{sheet.years}</p>
                )}
                {sheet.homeKin && (
                  <p className="text-sm font-medium text-sky-800">
                    {sheet.homeKin}
                  </p>
                )}
              </header>
              <footer className="space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  {t("tree.pathTextLink")}
                </p>
                <p className="break-all font-mono text-[11px]">{personUrl}</p>
                <p>{t("tree.occasionCardFooter")}</p>
              </footer>
            </article>
          </PrintableDocumentShell>
        )}
      </DialogContent>
    </Dialog>
  );
}
