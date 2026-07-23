import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { localeTag } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Printer,
  ArrowRight,
  TreePalm,
  ScrollText,
  BookOpen,
  Frame,
  Map,
  Landmark,
  Gift,
  Sparkles,
  Check,
  Fan,
  Sun,
  Network,
  ListTree,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Person, Relationship } from "@db/schema";
import type { TreeBranch } from "@db/tables";
import type { FemaleDisplay } from "@contracts/constants";
import { PRINT_TEMPLATES, getPrintTemplate } from "@/components/print/registry";
import PrintTemplateBody, { printPageCss } from "@/components/print/PrintTemplateBody";
import { TemplatePreviewThumb } from "@/components/print/TemplatePreviewThumb";
import PrintScopePanel from "@/components/print/PrintScopePanel";
import type { PrintTemplateId } from "@/components/print/types";
import {
  DEFAULT_PRINT_SCOPE,
  buildPrintSubgraph,
  scopeSummaryLabel,
  type PrintScope,
} from "@/lib/printFilter";

const TPL_ICONS: Record<PrintTemplateId, typeof TreePalm> = {
  palm: TreePalm,
  manuscript: ScrollText,
  book: BookOpen,
  poster: Frame,
  map: Map,
  clan: Landmark,
  occasions: Gift,
  ornate: Sparkles,
  fan: Fan,
  sun: Sun,
  classic: Network,
  pedigree: ListTree,
  heritage: Award,
};

export default function TreePrint() {
  const { id } = useParams<{ id: string }>();
  const treeId = parseInt(id ?? "0", 10);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { t, i18n } = useTranslation();
  const [template, setTemplate] = useState<PrintTemplateId>("palm");
  const [step, setStep] = useState<"pick" | "preview">("pick");
  const [scope, setScope] = useState<PrintScope>(DEFAULT_PRINT_SCOPE);

  const treeQuery = trpc.tree.get.useQuery(
    { id: treeId },
    { enabled: isAuthenticated && treeId > 0 },
  );
  const dataQuery = trpc.person.list.useQuery(
    { treeId },
    { enabled: isAuthenticated && treeId > 0 },
  );

  const designs = t("printDesigns.items", {
    returnObjects: true,
  }) as Array<{ name: string; desc: string }>;

  const selected = useMemo(() => getPrintTemplate(template), [template]);

  useEffect(() => {
    const fd = treeQuery.data?.femaleDisplay as FemaleDisplay | undefined;
    if (fd) {
      setScope((s) => ({ ...s, femaleDisplay: fd }));
    }
  }, [treeQuery.data?.femaleDisplay]);

  useEffect(() => {
    document.title = treeQuery.data
      ? t("printPage.title", { name: treeQuery.data.name })
      : t("printPage.print");
    return () => {
      document.title = `${t("brand")} — ${t("tagline")}`;
    };
  }, [treeQuery.data, t]);

  const allPeople = (dataQuery.data?.people ?? []) as Person[];
  const allRels = (dataQuery.data?.rels ?? []) as Relationship[];
  const branches = (dataQuery.data?.branches ?? []) as TreeBranch[];

  const subgraph = useMemo(
    () => buildPrintSubgraph(allPeople, allRels, branches, scope),
    [allPeople, allRels, branches, scope],
  );

  const scopeSummary = useMemo(() => {
    const root = allPeople.find((p) => p.id === subgraph.rootPersonId);
    const branch = branches.find((b) => b.id === scope.branchId);
    return scopeSummaryLabel(scope, root, branch, subgraph.people.length, t);
  }, [scope, subgraph, allPeople, branches, t]);

  if (treeQuery.isLoading || dataQuery.isLoading) {
    return (
      <div className="p-10 space-y-4">
        <Skeleton className="h-12 w-72 mx-auto" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  const tree = treeQuery.data;
  const today = new Date().toLocaleDateString(localeTag(i18n.language), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const designName =
    designs[PRINT_TEMPLATES.findIndex((x) => x.id === template)]?.name ?? template;

  const patchScope = (patch: Partial<PrintScope>) => {
    setScope((s) => ({ ...s, ...patch }));
  };

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="no-print sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between px-3 sm:px-4 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              step === "preview" ? setStep("pick") : navigate(`/trees/${treeId}`)
            }
            className="gap-2 shrink-0"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
            <span className="hidden sm:inline truncate max-w-[12rem]">
              {step === "preview" ? t("printPage.backTemplates") : t("printPage.back")}
            </span>
          </Button>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher variant="outline" />
            {step === "preview" && (
              <Button size="sm" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">{t("printPage.print")}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {step === "pick" ? (
        <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-balance">
              {t("printDesigns.title")}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto text-pretty">
              {t("printDesigns.subtitle")}
            </p>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {PRINT_TEMPLATES.map((tpl, i) => {
              const Icon = TPL_ICONS[tpl.id];
              const info = designs[i] ?? { name: tpl.id, desc: "" };
              const selectedCard = template === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setTemplate(tpl.id)}
                  className={cn(
                    "text-start rounded-2xl border-2 bg-card p-4 transition hover:shadow-md relative overflow-hidden",
                    selectedCard
                      ? "border-primary shadow-md ring-2 ring-primary/20"
                      : "border-border",
                  )}
                >
                  {selectedCard && (
                    <span className="absolute top-3 end-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white mb-3"
                    style={{ backgroundColor: tpl.accent }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-bold">{info.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed min-h-[2.5rem]">
                    {info.desc}
                  </p>
                  <div className="mt-3">
                    <TemplatePreviewThumb id={tpl.id} accent={tpl.accent} paper={tpl.paper} />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <Button size="lg" className="px-10 gap-2" onClick={() => setStep("preview")}>
              <Printer className="h-4 w-4" />
              {t("printPage.previewTemplate")}
            </Button>
          </div>
        </div>
      ) : tree ? (
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6">
          <PrintScopePanel
            scope={scope}
            onChange={patchScope}
            people={allPeople}
            rels={allRels}
            branches={branches}
            treeFemaleDisplay={(tree.femaleDisplay as FemaleDisplay) ?? "full"}
          />

          <p className="no-print text-xs text-muted-foreground text-center mb-4">
            {scopeSummary}
          </p>

          <div
            className="print-sheet relative mx-auto max-w-none px-4 py-8 md:px-8 print:max-w-none print:px-0"
            style={{ backgroundColor: selected.paper, color: "#1c1917" }}
          >
            {subgraph.people.length === 0 ? (
              <p className="text-center text-stone-400 py-20">{t("printPage.emptyScope")}</p>
            ) : (
              <PrintTemplateBody
                templateId={template}
                tree={{
                  name: tree.name,
                  tribe: tree.tribe,
                  region: tree.region,
                  description: tree.description,
                }}
                people={subgraph.people}
                rels={subgraph.rels}
                levels={subgraph.levels}
                rootPersonId={subgraph.rootPersonId}
                scopeSummary={scopeSummary}
                accent={selected.accent}
                paper={selected.paper}
                designName={designName}
                today={today}
              />
            )}
          </div>
        </div>
      ) : null}

      <style>{printPageCss(template)}</style>
    </div>
  );
}
