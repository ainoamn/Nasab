import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import FamilyChart from "@/components/tree/FamilyChart";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Person, Relationship } from "@db/schema";

const TPL = [
  { id: "palm", icon: TreePalm, accent: "#0F5132", paper: "#f3f7f0" },
  { id: "manuscript", icon: ScrollText, accent: "#B8860B", paper: "#faf6eb" },
  { id: "book", icon: BookOpen, accent: "#5B3A29", paper: "#fffdf8" },
  { id: "poster", icon: Frame, accent: "#1d4ed8", paper: "#ffffff" },
  { id: "map", icon: Map, accent: "#37526B", paper: "#eef5f8" },
  { id: "clan", icon: Landmark, accent: "#8B4513", paper: "#faf5ef" },
  { id: "occasions", icon: Gift, accent: "#9d174d", paper: "#fdf5f8" },
  { id: "ornate", icon: Sparkles, accent: "#0F5132", paper: "#f8f5ec" },
] as const;

type TemplateId = (typeof TPL)[number]["id"];

function PalmDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg className="absolute -top-6 start-1/2 -translate-x-1/2 h-40 w-40 text-emerald-800/15" viewBox="0 0 64 64" fill="currentColor">
        <path d="M32 58V34M32 34c-8-2-16-10-18-18 8 2 14 8 18 18zm0 0c8-2 16-10 18-18-8 2-14 8-18 18zm0 0c-2-10 2-20 10-26-2 10-6 18-10 26zm0 0c2-10-2-20-10-26 2 10 6 18 10 26z" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
      <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-emerald-900/15 to-transparent" />
    </div>
  );
}

function ManuscriptDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-30"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 28px, rgba(184,134,11,0.18) 29px)",
      }}
    />
  );
}

function MapDecor() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-25"
      style={{
        backgroundImage:
          "linear-gradient(#37526B22 1px, transparent 1px), linear-gradient(90deg, #37526B22 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    />
  );
}

function ClanStrip({ people }: { people: Person[] }) {
  const clans = [...new Set(people.map((p) => p.clan).filter(Boolean))] as string[];
  const tribes = [...new Set(people.map((p) => p.laqab).filter(Boolean))] as string[];
  if (clans.length === 0 && tribes.length === 0) return null;
  return (
    <div className="mb-6 flex flex-wrap justify-center gap-2">
      {tribes.map((x) => (
        <span key={x} className="rounded-full border border-amber-700/40 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
          {x}
        </span>
      ))}
      {clans.map((x) => (
        <span key={x} className="rounded-full border border-stone-400 bg-stone-50 px-3 py-1 text-xs text-stone-700">
          {x}
        </span>
      ))}
    </div>
  );
}

function BookPages({
  people,
  accent,
}: {
  people: Person[];
  accent: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 sm:grid-cols-2 mb-8">
      {people.slice(0, 12).map((p) => (
        <div
          key={p.id}
          className="rounded-xl border bg-white/80 p-4 shadow-sm"
          style={{ borderColor: `${accent}55` }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold"
              style={{
                backgroundColor: p.gender === "female" ? "#db2777" : "#2563eb",
              }}
            >
              {p.photoUrl ? (
                <img src={p.photoUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : p.gender === "female" ? (
                "♀"
              ) : (
                "♂"
              )}
            </span>
            <div>
              <p className="font-display text-lg font-bold" style={{ color: accent }}>
                {p.givenName}
              </p>
              {p.fatherName && (
                <p className="text-xs text-stone-500 font-display">{p.fatherName}</p>
              )}
            </div>
          </div>
          {p.notes ? (
            <p className="mt-2 text-xs text-stone-600 leading-relaxed line-clamp-3">{p.notes}</p>
          ) : (
            <p className="mt-2 text-xs text-stone-400 italic">{t("printPage.noStory")}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function OccasionsBanner({ accent }: { accent: string }) {
  const { t } = useTranslation();
  return (
    <div
      className="mb-6 rounded-2xl border-2 border-dashed px-4 py-3 text-center text-sm font-medium"
      style={{ borderColor: accent, color: accent, background: `${accent}10` }}
    >
      {t("printPage.occasionsBanner")}
    </div>
  );
}

export default function TreePrint() {
  const { id } = useParams<{ id: string }>();
  const treeId = parseInt(id ?? "0", 10);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const { t, i18n } = useTranslation();
  const [template, setTemplate] = useState<TemplateId>("palm");
  const [step, setStep] = useState<"pick" | "preview">("pick");

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

  const selected = useMemo(() => TPL.find((x) => x.id === template)!, [template]);

  useEffect(() => {
    document.title = treeQuery.data
      ? t("printPage.title", { name: treeQuery.data.name })
      : t("printPage.print");
    return () => {
      document.title = `${t("brand")} — ${t("tagline")}`;
    };
  }, [treeQuery.data, t]);

  if (treeQuery.isLoading || dataQuery.isLoading) {
    return (
      <div className="p-10 space-y-4">
        <Skeleton className="h-12 w-72 mx-auto" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  const tree = treeQuery.data;
  const people = (dataQuery.data?.people ?? []) as Person[];
  const rels = (dataQuery.data?.rels ?? []) as Relationship[];
  const today = new Date().toLocaleDateString(localeTag(i18n.language), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const designName =
    designs[TPL.findIndex((x) => x.id === template)]?.name ?? template;

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
            {TPL.map((tpl, i) => {
              const Icon = tpl.icon;
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
                  {/* معاينة مصغّرة حقيقية لكل قالب */}
                  <div
                    className="mt-3 relative h-20 rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: tpl.paper,
                      borderColor: `${tpl.accent}55`,
                    }}
                  >
                    {tpl.id === "palm" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <TreePalm className="h-7 w-7" style={{ color: tpl.accent }} />
                        <div className="mt-1 h-2 w-10 rounded-full" style={{ background: tpl.accent }} />
                        <div className="mt-1 flex gap-1">
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="h-2 w-2 rounded-full bg-pink-500" />
                          <span className="h-2 w-2 rounded-full bg-blue-500" />
                        </div>
                      </div>
                    )}
                    {tpl.id === "manuscript" && (
                      <div
                        className="absolute inset-0 p-2"
                        style={{
                          backgroundImage:
                            "repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(184,134,11,0.25) 9px)",
                        }}
                      >
                        <div className="mx-auto mt-2 h-8 w-8 rounded-full border-2" style={{ borderColor: tpl.accent }} />
                      </div>
                    )}
                    {tpl.id === "book" && (
                      <div className="absolute inset-2 grid grid-cols-2 gap-1">
                        <div className="rounded border bg-white/80" style={{ borderColor: `${tpl.accent}66` }} />
                        <div className="rounded border bg-white/80" style={{ borderColor: `${tpl.accent}66` }} />
                      </div>
                    )}
                    {tpl.id === "poster" && (
                      <div className="absolute inset-0 flex items-end justify-center gap-1 pb-2">
                        {[3, 5, 4, 6, 3].map((h, idx) => (
                          <span
                            key={idx}
                            className="w-3 rounded-t"
                            style={{ height: `${h * 8}px`, background: idx % 2 ? "#db2777" : "#2563eb" }}
                          />
                        ))}
                      </div>
                    )}
                    {tpl.id === "map" && (
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage:
                            "linear-gradient(#37526B33 1px, transparent 1px), linear-gradient(90deg, #37526B33 1px, transparent 1px)",
                          backgroundSize: "12px 12px",
                        }}
                      >
                        <span className="absolute top-1/3 start-1/3 h-2 w-2 rounded-full bg-red-500" />
                        <span className="absolute top-1/2 end-1/3 h-2 w-2 rounded-full bg-red-500" />
                      </div>
                    )}
                    {tpl.id === "clan" && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[9px]" style={{ color: tpl.accent }}>
                        <span className="font-bold">قبيلة</span>
                        <span>↓</span>
                        <span>بطن / فخذ</span>
                        <span>↓</span>
                        <span>عائلة</span>
                      </div>
                    )}
                    {tpl.id === "occasions" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Gift className="h-8 w-8" style={{ color: tpl.accent }} />
                      </div>
                    )}
                    {tpl.id === "ornate" && (
                      <div
                        className="absolute inset-2 border-4 border-double rounded-lg"
                        style={{ borderColor: tpl.accent }}
                      >
                        <div className="flex h-full items-center justify-center text-lg">✦</div>
                      </div>
                    )}
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
      ) : (
        <div
          className={cn("print-sheet relative mx-auto max-w-none px-4 py-8 md:px-8 print:max-w-none print:px-0")}
          style={{ backgroundColor: selected.paper, color: "#1c1917" }}
        >
          {template === "palm" && <PalmDecor />}
          {template === "manuscript" && <ManuscriptDecor />}
          {template === "map" && <MapDecor />}

          <header
            className={cn(
              "relative z-10 mb-8 text-center pb-6",
              template === "manuscript" && "border-b-4 border-double",
              template === "palm" && "border-b-2",
              template === "book" && "border-b border-stone-300",
              template === "ornate" && "border-[6px] border-double rounded-3xl p-6 mb-8",
              template === "poster" && "bg-gradient-to-b from-blue-50 to-transparent rounded-2xl p-6",
              template === "occasions" && "rounded-2xl border-2 border-dashed p-5",
              template === "clan" && "border-b-2 border-amber-800/40",
              template === "map" && "border-b border-slate-400",
            )}
            style={{ borderColor: selected.accent }}
          >
            <p
              className="text-xs font-medium tracking-wide mb-2"
              style={{ color: selected.accent }}
            >
              {designName}
            </p>
            <h1
              className={cn(
                "font-display font-bold",
                template === "poster" ? "text-5xl md:text-6xl" : "text-3xl md:text-4xl",
              )}
              style={{ color: selected.accent }}
            >
              {t("printPage.treeOf", { name: tree?.name })}
            </h1>
            <p className="font-display text-lg mt-2 text-stone-600">
              {[tree?.tribe, tree?.region].filter(Boolean).join(" — ")}
            </p>
            <div className="mt-3 flex items-center justify-center gap-6 text-xs text-stone-500 flex-wrap">
              <span>{t("printPage.count", { count: people.length })}</span>
              <span>{t("printPage.date", { date: today })}</span>
              <span>{t("printPage.by")}</span>
            </div>
          </header>

          <div className="relative z-10">
            {template === "clan" && <ClanStrip people={people} />}
            {template === "occasions" && <OccasionsBanner accent={selected.accent} />}
            {template === "book" && (
              <>
                <h2
                  className="font-display text-xl font-bold text-center mb-4"
                  style={{ color: selected.accent }}
                >
                  {t("printPage.bookChapters")}
                </h2>
                <BookPages people={people} accent={selected.accent} />
                <h2
                  className="font-display text-xl font-bold text-center mb-4 mt-8"
                  style={{ color: selected.accent }}
                >
                  {t("printPage.bookTree")}
                </h2>
              </>
            )}

            {people.length === 0 ? (
              <p className="text-center text-stone-400 py-20">{t("printPage.empty")}</p>
            ) : (
              <div
                className={cn(
                  "rounded-2xl overflow-visible print:overflow-visible",
                  template === "ornate" && "p-3 border-4 border-double",
                  template === "palm" && "p-2 border-2 border-emerald-800/20 rounded-[2rem]",
                  template === "manuscript" && "p-3 border-2 border-amber-700/40",
                  template === "poster" && "p-4 bg-white shadow-lg border print:shadow-none",
                  template === "map" && "p-3 border border-slate-400 bg-white/70",
                )}
                style={
                  template === "ornate"
                    ? { borderColor: selected.accent }
                    : undefined
                }
              >
                <FamilyChart
                  people={people}
                  rels={rels}
                  compact
                  disablePanZoom
                />
              </div>
            )}
          </div>

          <div
            className="relative z-10 mt-10 border-t pt-4 text-center text-xs text-stone-500 font-display"
            style={{ borderColor: `${selected.accent}55` }}
          >
            {t("printPage.quote")}
            <p className="mt-1 opacity-70">{designName}</p>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-sheet {
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          svg { overflow: visible !important; }
        }
      `}</style>
    </div>
  );
}
