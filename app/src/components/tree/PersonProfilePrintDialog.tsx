import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import {
  buildChildrenOf,
  buildSpousesOf,
  getParents,
} from "@/lib/familyGraph";
import { formatBirthYear } from "@/lib/printData";
import { findPersonGaps } from "@/lib/personGaps";
import {
  classifyRelationPath,
  findRelationPath,
} from "@/lib/relationPath";
import { PrintableDocumentShell } from "@/components/PrintableDocumentShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: Person | null;
  people: Person[];
  rels: Relationship[];
  homePersonId?: number | null;
  personUrl: string;
  treeName?: string;
};

/** ورقة ملف شخص قابلة للطباعة — عائلة مباشرة + نواقص + رابط */
export default function PersonProfilePrintDialog({
  open,
  onOpenChange,
  person,
  people,
  rels,
  homePersonId = null,
  personUrl,
  treeName,
}: Props) {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const childrenOf = useMemo(() => buildChildrenOf(rels), [rels]);
  const spousesOf = useMemo(() => buildSpousesOf(rels), [rels]);

  const sheet = useMemo(() => {
    if (!person) return null;
    const { fatherId, motherId } = getParents(person.id, rels, byId);
    const rows: Array<{ role: string; name: string }> = [];
    if (fatherId && byId.has(fatherId)) {
      rows.push({
        role: t("detail.father"),
        name: byId.get(fatherId)!.givenName,
      });
    }
    if (motherId && byId.has(motherId)) {
      rows.push({
        role: t("detail.mother"),
        name: byId.get(motherId)!.givenName,
      });
    }
    for (const sid of spousesOf.get(person.id) ?? []) {
      const s = byId.get(sid);
      if (s) rows.push({ role: t("detail.spouse"), name: s.givenName });
    }
    const siblingIds = new Set<number>();
    for (const pid of [fatherId, motherId]) {
      if (pid == null) continue;
      for (const sid of childrenOf.get(pid) ?? []) {
        if (sid !== person.id) siblingIds.add(sid);
      }
    }
    for (const sid of siblingIds) {
      const s = byId.get(sid);
      if (s) rows.push({ role: t("detail.sibling"), name: s.givenName });
    }
    for (const cid of childrenOf.get(person.id) ?? []) {
      const c = byId.get(cid);
      if (c) rows.push({ role: t("detail.child"), name: c.givenName });
    }

    const gaps = findPersonGaps(person, people, rels);
    let homeKin: string | null = null;
    let hopNames: string[] = [];
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
      if (hops) {
        hopNames = hops
          .map((h) => byId.get(h.personId)?.givenName)
          .filter((n): n is string => !!n);
      }
    }

    return {
      years: formatBirthYear(person),
      rows,
      gaps,
      homeKin,
      hopNames,
    };
  }, [person, people, rels, byId, childrenOf, spousesOf, homePersonId, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="no-print">
          <DialogTitle>{t("tree.profilePrintTitle")}</DialogTitle>
          <DialogDescription>{t("tree.profilePrintHint")}</DialogDescription>
        </DialogHeader>

        {!person || !sheet ? (
          <p className="text-sm text-muted-foreground">—</p>
        ) : (
          <PrintableDocumentShell
            title={`${t("tree.profilePrintTitle")} — ${person.givenName}`}
          >
            <article className="space-y-4 text-start" dir="auto">
              <header className="space-y-1 border-b pb-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {t("brand")}
                  {treeName ? ` · ${treeName}` : ""}
                </p>
                <div className="mx-auto flex h-16 w-16 overflow-hidden rounded-full bg-sky-100">
                  {person.photoUrl ? (
                    <img
                      src={person.photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-xl font-bold text-sky-800">
                      {person.givenName.slice(0, 1)}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl font-bold">
                  {person.givenName}
                </h1>
                {sheet.years && (
                  <p className="text-sm text-muted-foreground">{sheet.years}</p>
                )}
                {sheet.homeKin && (
                  <p className="text-sm font-medium text-sky-800">
                    {sheet.homeKin}
                  </p>
                )}
              </header>

              {sheet.rows.length > 0 && (
                <section>
                  <h2 className="mb-1 text-sm font-semibold">
                    {t("detail.immediateFamily")}
                  </h2>
                  <ul className="space-y-1 text-sm">
                    {sheet.rows.map((r, i) => (
                      <li key={`${r.role}-${r.name}-${i}`}>
                        <span className="text-muted-foreground">{r.role}: </span>
                        {r.name}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {sheet.hopNames.length > 1 && (
                <section>
                  <h2 className="mb-1 text-sm font-semibold">
                    {t("detail.pathToHome")}
                  </h2>
                  <p className="text-sm">{sheet.hopNames.join(" → ")}</p>
                </section>
              )}

              {sheet.gaps.length > 0 && (
                <section>
                  <h2 className="mb-1 text-sm font-semibold">
                    {t("detail.gapsTitle")}
                  </h2>
                  <ul className="list-inside list-disc space-y-0.5 text-sm">
                    {sheet.gaps.map((g) => (
                      <li key={g.kind}>{t(`detail.gap.${g.kind}`)}</li>
                    ))}
                  </ul>
                </section>
              )}

              <footer className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  {t("tree.pathTextLink")}
                </p>
                <p className="break-all font-mono text-[11px]">{personUrl}</p>
                <p>{t("tree.profilePrintFooter")}</p>
              </footer>
            </article>
          </PrintableDocumentShell>
        )}
      </DialogContent>
    </Dialog>
  );
}
