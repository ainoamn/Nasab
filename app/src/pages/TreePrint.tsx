import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { localeTag } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileImage,
  FileText,
  Loader2,
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
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Person, Relationship } from "@db/schema";
import type { TreeBranch } from "@db/tables";
import type { FemaleDisplay } from "@contracts/constants";
import { PRINT_TEMPLATES, getPrintTemplate } from "@/components/print/registry";
import PrintTemplateBody, {
  defaultPaperForTemplate,
  printOrient,
  printPageCss,
} from "@/components/print/PrintTemplateBody";
import { TemplatePreviewThumb } from "@/components/print/TemplatePreviewThumb";
import PrintScopePanel from "@/components/print/PrintScopePanel";
import type { PrintTemplateId } from "@/components/print/types";
import {
  DEFAULT_PRINT_SCOPE,
  buildPrintSubgraph,
  scopeSummaryLabel,
  type PrintScope,
} from "@/lib/printFilter";
import { fitPrintSheetToPage } from "@/lib/printFit";
import { downloadPrintPdf, downloadPrintPng } from "@/lib/printExport";
import { parsePersonIdParam } from "@/lib/treeUrl";
import { getHomePersonId } from "@/lib/homePerson";
import { toast } from "sonner";

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { t, i18n } = useTranslation();
  const [template, setTemplate] = useState<PrintTemplateId>("palm");
  const [step, setStep] = useState<"pick" | "preview">("pick");
  const [scope, setScope] = useState<PrintScope>(DEFAULT_PRINT_SCOPE);
  const [rootBootstrapped, setRootBootstrapped] = useState(false);
  const [templateBootstrapped, setTemplateBootstrapped] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);

  const treeQuery = trpc.tree.get.useQuery(
    { id: treeId },
    { enabled: isAuthenticated && treeId > 0 },
  );
  const dataQuery = trpc.person.list.useQuery(
    { treeId },
    { enabled: isAuthenticated && treeId > 0 },
  );

  const allPeople = useMemo(
    () => (dataQuery.data?.people ?? []) as Person[],
    [dataQuery.data?.people],
  );
  const allRels = (dataQuery.data?.rels ?? []) as Relationship[];
  const branches = (dataQuery.data?.branches ?? []) as TreeBranch[];

  useEffect(() => {
    if (templateBootstrapped) return;
    const raw = searchParams.get("template");
    if (
      raw &&
      PRINT_TEMPLATES.some((x) => x.id === raw)
    ) {
      setTemplate(raw as PrintTemplateId);
    }
    setTemplateBootstrapped(true);
  }, [searchParams, templateBootstrapped]);

  useEffect(() => {
    if (rootBootstrapped || dataQuery.isLoading || allPeople.length === 0) return;
    const fromUrl = parsePersonIdParam(searchParams.get("root"));
    const fromHome = getHomePersonId(treeId);
    const rootId =
      (fromUrl != null && allPeople.some((p) => p.id === fromUrl)
        ? fromUrl
        : null) ??
      (fromHome != null && allPeople.some((p) => p.id === fromHome)
        ? fromHome
        : null) ??
      allPeople.find((p) => p.gender !== "female")?.id ??
      allPeople[0]?.id ??
      null;
    if (rootId != null) {
      setScope((s) => ({ ...s, rootPersonId: rootId }));
    }
    setRootBootstrapped(true);
  }, [
    rootBootstrapped,
    dataQuery.isLoading,
    allPeople,
    searchParams,
    treeId,
  ]);

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

  // عند تغيير القالب: اقترح حجم ورقة مناسب إن لم يغيّره المستخدم يدوياً بعد
  useEffect(() => {
    setScope((s) => ({ ...s, paperSize: defaultPaperForTemplate(template) }));
  }, [template]);

  useEffect(() => {
    document.title = treeQuery.data
      ? t("printPage.title", { name: treeQuery.data.name })
      : t("printPage.print");
    return () => {
      document.title = `${t("brand")} — ${t("tagline")}`;
    };
  }, [treeQuery.data, t]);

  const subgraph = useMemo(
    () => buildPrintSubgraph(allPeople, allRels, branches, scope),
    [allPeople, allRels, branches, scope],
  );

  /** ضغط المحتوى لصفحة واحدة + استعادة بعده */
  useEffect(() => {
    if (step !== "preview") return;
    let restore: (() => void) | undefined;
    const onBefore = () => {
      restore?.();
      restore = fitPrintSheetToPage(scope.paperSize);
    };
    const onAfter = () => {
      restore?.();
      restore = undefined;
    };
    window.addEventListener("beforeprint", onBefore);
    window.addEventListener("afterprint", onAfter);
    return () => {
      window.removeEventListener("beforeprint", onBefore);
      window.removeEventListener("afterprint", onAfter);
      restore?.();
    };
  }, [step, scope.paperSize, template, subgraph.people.length]);

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

  const exportTitle = `${tree?.name ?? "nasab"}-${designName}`;

  const runExport = async (kind: "pdf" | "png") => {
    if (exporting) return;
    setExporting(kind);
    toast.message(t("printPage.downloadWorking"));
    try {
      if (kind === "pdf") {
        await downloadPrintPdf({
          title: exportTitle,
          paperSize: scope.paperSize,
          pixelRatio: 4,
        });
      } else {
        await downloadPrintPng({
          title: exportTitle,
          pixelRatio: 4,
        });
      }
      toast.success(t("printPage.downloadDone"));
    } catch (err) {
      console.error(err);
      toast.error(t("printPage.downloadFailed"));
    } finally {
      setExporting(null);
    }
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-2" disabled={!!exporting}>
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{t("printPage.download")}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground leading-snug">
                    {t("printPage.downloadHint")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={!!exporting}
                    onClick={() => void runExport("pdf")}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {t("printPage.downloadPdf")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={!!exporting}
                    onClick={() => void runExport("png")}
                    className="gap-2"
                  >
                    <FileImage className="h-4 w-4" />
                    {t("printPage.downloadPng")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <Download className="h-4 w-4" />
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
            <span className="mt-1 block text-[11px] text-amber-800/90">
              {t("printPage.downloadHint")}
            </span>
          </p>

          <div
            className="print-sheet relative mx-auto max-w-none overflow-visible px-4 py-8 md:px-8 print:max-w-none print:overflow-visible print:px-0 print:py-0"
            data-print-orient={printOrient(scope.paperSize)}
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
                nameMode={scope.nameMode}
              />
            )}
          </div>
        </div>
      ) : null}

      <style>{printPageCss(template, scope.paperSize)}</style>
    </div>
  );
}
