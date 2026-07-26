import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import {
  classifyRelationPath,
  findCommonAncestorId,
  findRelationPath,
  type PathHop,
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
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromId: number | null;
  toId: number | null;
  people: Person[];
  rels: Relationship[];
  pathUrl: string;
  treeName?: string;
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

/** شهادة قرابة قابلة للطباعة — مسار + الشخصان + جد مشترك + رابط عميق */
export default function KinshipCertificateDialog({
  open,
  onOpenChange,
  fromId,
  toId,
  people,
  rels,
  pathUrl,
  treeName,
}: Props) {
  const { t } = useTranslation();
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);

  const data = useMemo(() => {
    if (fromId == null || toId == null) return null;
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) return null;
    const hops = findRelationPath(fromId, toId, people, rels);
    if (!hops || hops.length < 2) return null;
    const key = classifyRelationPath(fromId, toId, people, rels, hops);
    const mrcaId = findCommonAncestorId(hops);
    const mrca = mrcaId != null ? byId.get(mrcaId) : null;
    return {
      from,
      to,
      hops,
      label: t(`tree.rel.${key}`),
      mrca,
    };
  }, [fromId, toId, byId, people, rels, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="no-print">
          <DialogTitle>{t("tree.kinshipCertTitle")}</DialogTitle>
          <DialogDescription>{t("tree.kinshipCertHint")}</DialogDescription>
        </DialogHeader>

        {!data ? (
          <p className="text-sm text-muted-foreground">
            {t("tree.howRelatedNone")}
          </p>
        ) : (
          <PrintableDocumentShell
            title={`${t("tree.kinshipCertTitle")} — ${data.from.givenName} ↔ ${data.to.givenName}`}
          >
            <article className="space-y-5 text-center" dir="auto">
              <header className="space-y-1 border-b pb-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("brand")}
                  {treeName ? ` · ${treeName}` : ""}
                </p>
                <h1 className="font-display text-2xl font-bold text-sky-950">
                  {t("tree.kinshipCertTitle")}
                </h1>
                <p className="text-base font-semibold text-sky-800">
                  {data.from.givenName} ↔ {data.to.givenName}
                </p>
                <p className="text-lg font-bold text-amber-900">{data.label}</p>
                {data.mrca && (
                  <p className="mt-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-950">
                    {t("tree.commonAncestorAt", { name: data.mrca.givenName })}
                  </p>
                )}
              </header>

              <div className="grid gap-3 sm:grid-cols-2">
                {[data.from, data.to].map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-3 text-start"
                  >
                    <p className="font-display text-lg font-semibold">
                      {p.givenName}
                    </p>
                    {formatBirthYear(p) && (
                      <p className="text-sm text-muted-foreground">
                        {formatBirthYear(p)}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <section className="space-y-2 text-start">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {t("tree.pathTextHops")}
                </h2>
                <ol className="space-y-1">
                  {data.hops.map((hop, i) => {
                    const person = byId.get(hop.personId);
                    if (!person) return null;
                    const edge = viaLabel(hop.via, t);
                    const isMrca = data.mrca?.id === person.id;
                    return (
                      <li key={`${hop.personId}-${i}`}>
                        {edge && (
                          <p className="ps-3 text-[11px] text-muted-foreground">
                            ← {edge}
                          </p>
                        )}
                        <p
                          className={cn(
                            "rounded-lg border px-3 py-1.5 text-sm font-medium",
                            i === 0 && "border-sky-300 bg-sky-50",
                            i === data.hops.length - 1 &&
                              i !== 0 &&
                              "border-pink-300 bg-pink-50",
                            isMrca && "border-amber-400 bg-amber-50 ring-1 ring-amber-300",
                          )}
                        >
                          {person.givenName}
                          {isMrca ? ` · ${t("tree.commonAncestorTag")}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <footer className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  {t("tree.pathTextLink")}
                </p>
                <p className="break-all font-mono text-[11px]">{pathUrl}</p>
                <p className="pt-2">{t("tree.kinshipCertFooter")}</p>
              </footer>
            </article>
          </PrintableDocumentShell>
        )}
      </DialogContent>
    </Dialog>
  );
}
