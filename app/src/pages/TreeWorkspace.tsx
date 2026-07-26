import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import FamilyChart from "@/components/tree/FamilyChart";
import PedigreeView from "@/components/tree/PedigreeView";
import FanChartView from "@/components/tree/FanChartView";
import TreeHomeBanner from "@/components/tree/TreeHomeBanner";
import ChartPersonSearch from "@/components/tree/ChartPersonSearch";
import PhotosGallery from "@/components/tree/PhotosGallery";
import EventsStrip from "@/components/tree/EventsStrip";
import DiscoveriesPanel from "@/components/tree/DiscoveriesPanel";
import PersonFormDialog from "@/components/tree/PersonFormDialog";
import RelationDialog from "@/components/tree/RelationDialog";
import CsvImportDialog from "@/components/tree/CsvImportDialog";
import { useLabels } from "@/lib/labels";
import { computePersonRanks, formatBirthDate } from "@/lib/birthOrder";
import PersonRankLines from "@/components/tree/PersonRankLines";
import {
  buildChildrenOf,
  buildSpousesOf,
  collectFocusedSubgraph,
  findUnlinkedPersonIds,
  getParents,
} from "@/lib/familyGraph";
import { relationToFocus } from "@/lib/relationshipLabel";
import { collectCloseFamily } from "@/lib/closeFamily";
import { limitPeopleByGenerations } from "@/lib/generationLimit";
import { buildGedcom, downloadGedcom } from "@/lib/gedcomExport";
import { localeTag } from "@/i18n";
import type {
  TreeRole,
  TreeStatus,
  TreeVisibility,
  FemaleDisplay,
  PersonPrivacy,
} from "@contracts/constants";
import type { Person } from "@db/tables";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserPlus,
  FileSpreadsheet,
  Users,
  Printer,
  Settings,
  Share2,
  Search,
  Pencil,
  Trash2,
  Link2,
  TreePalm,
  History,
  LayoutGrid,
  List,
  ShieldCheck,
  Eye,
  Focus,
  Unlink,
  Network,
  GitBranch,
  Fan,
  Home,
  Maximize2,
  Minimize2,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { findSpouseRel } from "@/lib/spouseMeta";

export default function TreeWorkspace() {
  const { id } = useParams<{ id: string }>();
  const treeId = parseInt(id ?? "0", 10);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const { t, i18n } = useTranslation();
  const L = useLabels();

  const [addOpen, setAddOpen] = useState(false);
  const [addAnchorId, setAddAnchorId] = useState<number | null>(null);
  const [addKinship, setAddKinship] = useState<
    "father" | "mother" | "son" | "daughter" | "spouse" | "brother" | "sister" | null
  >(null);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [detailPerson, setDetailPerson] = useState<Person | null>(null);
  const [deletePerson, setDeletePerson] = useState<Person | null>(null);
  const [linkAnchor, setLinkAnchor] = useState<Person | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [chartFocusId, setChartFocusId] = useState<number | null>(null);
  const [chartRevision, setChartRevision] = useState(0);
  const [chartView, setChartView] = useState<
    "family" | "close" | "pedigree" | "fan"
  >("family");
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [maxGenerations, setMaxGenerations] = useState(8);

  useEffect(() => {
    if (!chartFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setChartFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chartFullscreen]);

  /** بعد إضافة/تعديل: اخرج من وضع التركيز دون إعادة تركيب المخطط (يحافظ على السحب والتكبير) */
  const refreshChart = () => {
    setChartFocusId(null);
  };

  const treeQuery = trpc.tree.get.useQuery({ id: treeId }, { enabled: isAuthenticated && treeId > 0 });
  const dataQuery = trpc.person.list.useQuery({ treeId }, { enabled: isAuthenticated && treeId > 0 });
  const logQuery = trpc.log.list.useQuery({ treeId }, { enabled: isAuthenticated && treeId > 0 });

  const tree = treeQuery.data;
  const people = useMemo(() => dataQuery.data?.people ?? [], [dataQuery.data]);
  const rels = useMemo(() => dataQuery.data?.rels ?? [], [dataQuery.data]);
  const branches = useMemo(() => dataQuery.data?.branches ?? [], [dataQuery.data]);
  const remotePeople = useMemo(() => dataQuery.data?.remotePeople ?? [], [dataQuery.data]);

  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );
  const spousesOf = useMemo(() => buildSpousesOf(rels), [rels]);
  const childrenOf = useMemo(() => buildChildrenOf(rels), [rels]);
  const chartFocusPerson = chartFocusId
    ? (peopleById.get(chartFocusId) ?? null)
    : null;
  const chartSubgraph = useMemo(() => {
    if (!chartFocusId) return { people, rels };
    return collectFocusedSubgraph(chartFocusId, people, rels);
  }, [chartFocusId, people, rels]);
  const chartPeople = chartSubgraph.people;
  const chartRels = chartSubgraph.rels;

  const closeFocusId =
    chartFocusId ??
    detailPerson?.id ??
    chartPeople.find((p) => p.gender !== "female")?.id ??
    chartPeople[0]?.id ??
    null;

  const closeSubgraph = useMemo(() => {
    if (chartView !== "close" || closeFocusId == null) {
      return { people: chartPeople, rels: chartRels };
    }
    return collectCloseFamily(closeFocusId, people, rels);
  }, [chartView, closeFocusId, chartPeople, chartRels, people, rels]);

  const familyViewData = useMemo(() => {
    if (chartView === "close") return closeSubgraph;
    if (chartView !== "family") return { people: chartPeople, rels: chartRels };
    return limitPeopleByGenerations(
      chartPeople,
      chartRels,
      maxGenerations,
      chartFocusId,
    );
  }, [
    chartView,
    closeSubgraph,
    chartPeople,
    chartRels,
    maxGenerations,
    chartFocusId,
  ]);

  const unlinkedIds = useMemo(
    () => findUnlinkedPersonIds(people, rels),
    [people, rels],
  );

  const focusOnPerson = (personId: number) => {
    setChartFocusId(personId);
    setChartRevision((n) => n + 1);
    setDetailPerson(null);
  };

  const myRole = (tree?.myRole ?? "viewer") as TreeRole;
  const treeStatus = (tree?.status ?? "active") as TreeStatus;
  const canEdit = myRole === "owner" || myRole === "admin" || myRole === "editor";
  const canWrite = canEdit && treeStatus === "active";
  const canAdmin = myRole === "owner" || myRole === "admin";

  const ensureLineageMut = trpc.person.ensurePersonLineage.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const openPersonTree = async (personId: number) => {
    if (canWrite) {
      try {
        const res = await ensureLineageMut.mutateAsync({ treeId, personId });
        if (res.linked) {
          await utils.person.list.invalidate({ treeId });
          await utils.person.list.refetch({ treeId });
        }
      } catch {
        // نفتح الشجرة حتى لو فشل الربط
      }
    }
    focusOnPerson(personId);
  };
  const toggleBranchMut = trpc.person.toggleBranch.useMutation({
    onSuccess: async () => {
      await utils.person.list.invalidate({ treeId });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.person.remove.useMutation({
    onSuccess: async () => {
      toast.success(t("tree.deleted"));
      await utils.person.list.invalidate({ treeId });
      setDeletePerson(null);
      setDetailPerson(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const unlinkMut = trpc.person.removeRelationship.useMutation({
    onSuccess: async () => {
      toast.success(t("detail.unlinked"));
      await utils.person.list.invalidate({ treeId });
      await utils.person.list.refetch({ treeId });
      setChartRevision((n) => n + 1);
    },
    onError: (e) => toast.error(e.message),
  });

  const unlinkParent = (parentId: number, childId: number, name: string) => {
    const rel = rels.find(
      (r) =>
        r.type === "parent" &&
        r.fromPersonId === parentId &&
        r.toPersonId === childId,
    );
    if (!rel) return;
    if (!window.confirm(t("detail.unlinkConfirm", { name }))) return;
    unlinkMut.mutate({ id: rel.id, treeId });
  };

  const unlinkSpouse = (aId: number, bId: number, name: string) => {
    const rel = findSpouseRel(rels, aId, bId);
    if (!rel) return;
    if (!window.confirm(t("detail.unlinkConfirm", { name }))) return;
    unlinkMut.mutate({ id: rel.id, treeId });
  };

  const listFocusId = chartFocusId ?? detailPerson?.id ?? people[0]?.id ?? null;

  const openAddRelative = (
    anchorId: number,
    kinship:
      | "father"
      | "mother"
      | "son"
      | "daughter"
      | "spouse"
      | "brother"
      | "sister" = "son",
  ) => {
    setAddAnchorId(anchorId);
    setAddKinship(kinship);
    setDetailPerson(null);
    setAddOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return people;
    return people.filter((p) =>
      [p.givenName, p.fatherName, p.kunya, p.laqab, p.clan]
        .filter(Boolean)
        .some((f) => f!.includes(q)),
    );
  }, [people, search]);

  if (treeQuery.isLoading || dataQuery.isLoading) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="p-8 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (treeQuery.error || !tree) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center py-24 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h1 className="font-display text-2xl font-bold">{t("tree.forbiddenTitle")}</h1>
          <p className="text-muted-foreground mt-2">{t("tree.forbiddenBody")}</p>
          <Button className="mt-6" onClick={() => navigate("/dashboard")}>{t("tree.backToTrees")}</Button>
        </div>
      </div>
    );
  }

  const shareUrl = tree.shareToken
    ? `${window.location.origin}/share/${tree.shareToken}`
    : "";

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />

      {treeStatus === "paused" && (
        <div className="border-b border-amber-300/60 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          {t("tree.pausedBanner")}
        </div>
      )}

      {/* شريط الشجرة */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start sm:items-center gap-3">
              <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TreePalm className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-xl sm:text-2xl font-bold break-words">
                    {tree.name}
                  </h1>
                  <Badge variant="secondary">{L.roles[myRole]}</Badge>
                  <Badge variant="outline">{L.visibility[tree.visibility as TreeVisibility]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {[tree.tribe, tree.region].filter(Boolean).join(" — ")}
                  {" • "}
                  {L.personCount(people.length)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canWrite && (
                <>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAddAnchorId(null);
                      setAddKinship(null);
                      setAddOpen(true);
                    }}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    {t("tree.addPerson")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setImportOpen(true)}
                    className="gap-2"
                    title={t("tree.importExcel")}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("tree.importExcel")}</span>
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" asChild className="gap-2" title={t("tree.members")}>
                <Link to={`/trees/${treeId}/members`}>
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tree.members")}</span>
                </Link>
              </Button>
              <Button size="sm" variant="outline" asChild className="gap-2" title={t("tree.print")}>
                <Link to={`/trees/${treeId}/print`}>
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("tree.print")}</span>
                </Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                title={t("tree.exportGedcom")}
                onClick={() => {
                  const content = buildGedcom(tree.name, people, rels);
                  downloadGedcom(`${tree.name || "nasab"}.ged`, content);
                  toast.success(t("tree.exportGedcomDone"));
                }}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">{t("tree.exportGedcom")}</span>
              </Button>
              {canAdmin && treeStatus === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSettingsOpen(true)}
                  className="gap-2"
                  title={t("tree.settings")}
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline">{t("tree.settings")}</span>
                </Button>
              )}
              {tree.visibility !== "private" && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2"
                  title={t("tree.copyLink")}
                  onClick={() => {
                    void navigator.clipboard.writeText(shareUrl);
                    toast.success(t("tree.linkCopied"));
                  }}
                >
                  <Share2 className="h-4 w-4" />
                  <span className="hidden lg:inline">{t("tree.copyLink")}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى */}
      <main className="mx-auto max-w-7xl px-3 sm:px-4 py-4 sm:py-6 min-w-0 overflow-x-hidden">
        <TreeHomeBanner
          treeName={tree.name}
          tribe={tree.tribe}
          region={tree.region}
          description={tree.description}
          peopleCount={people.length}
          photoCount={people.filter((p) => !!p.photoUrl).length}
          spouseLinkCount={rels.filter((r) => r.type === "spouse").length}
          livingCount={people.filter((p) => p.isLiving).length}
          ownerName={myRole === "owner" ? (user?.name ?? null) : null}
        />

        <EventsStrip
          people={people}
          rels={rels}
          onPersonClick={(p) => {
            setDetailPerson(p);
            setChartFocusId(p.id);
          }}
        />

        <DiscoveriesPanel
          people={people}
          rels={rels}
          canWrite={canWrite}
          onOpenPerson={(id) => {
            const p = peopleById.get(id);
            if (p) {
              setDetailPerson(p);
              setChartFocusId(id);
            }
          }}
          onAddParent={(personId, role) => openAddRelative(personId, role)}
        />

        <Tabs defaultValue="chart" className="min-w-0">
          <TabsList className="mb-4 w-full sm:w-auto h-auto flex flex-wrap justify-start gap-1 p-1">
            <TabsTrigger value="chart" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <LayoutGrid className="h-4 w-4" /> {t("tree.chart")}
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <List className="h-4 w-4" /> {t("tree.list")}
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <ImageIcon className="h-4 w-4" /> {t("tree.photos")}
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <History className="h-4 w-4" /> {t("tree.log")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="min-w-0">
            {chartFocusPerson && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <Focus className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 min-w-0">
                  {t("tree.chartFocusedOn", { name: chartFocusPerson.givenName })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setChartFocusId(null)}
                >
                  {t("tree.viewFullTree")}
                </Button>
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border bg-card p-0.5 shadow-sm">
                  {(
                    [
                      { id: "family" as const, icon: Network, label: t("chart.viewFamily") },
                      { id: "close" as const, icon: Home, label: t("chart.viewClose") },
                      { id: "pedigree" as const, icon: GitBranch, label: t("chart.viewPedigree") },
                      { id: "fan" as const, icon: Fan, label: t("chart.viewFan") },
                    ] as const
                  ).map((v) => (
                    <Button
                      key={v.id}
                      type="button"
                      size="sm"
                      variant={chartView === v.id ? "secondary" : "ghost"}
                      className="gap-1.5 h-8"
                      onClick={() => setChartView(v.id)}
                      title={v.label}
                    >
                      <v.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{v.label}</span>
                    </Button>
                  ))}
                </div>
                <ChartPersonSearch
                  people={chartPeople}
                  onSelect={(p) => {
                    setDetailPerson(p);
                    setChartFocusId(p.id);
                  }}
                />
                {chartView === "family" && (
                  <div className="flex items-center gap-1.5 rounded-xl border bg-card px-2 py-1 text-xs">
                    <Label htmlFor="max-gen" className="text-muted-foreground whitespace-nowrap">
                      {t("chart.maxGenerations")}
                    </Label>
                    <select
                      id="max-gen"
                      className="h-7 rounded-md border bg-background px-1.5 text-xs"
                      value={maxGenerations}
                      onChange={(e) => setMaxGenerations(Number(e.target.value))}
                    >
                      {[3, 4, 5, 6, 8, 10, 12, 99].map((n) => (
                        <option key={n} value={n}>
                          {n >= 99 ? t("chart.allGenerations") : n}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  title={
                    chartFullscreen
                      ? t("chart.exitFullscreen")
                      : t("chart.fullscreen")
                  }
                  onClick={() => setChartFullscreen((v) => !v)}
                >
                  {chartFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("chart.showingCount", {
                  shown:
                    chartView === "family" || chartView === "close"
                      ? familyViewData.people.length
                      : chartPeople.length,
                  total: people.length,
                })}
              </p>
            </div>

            <div
              className={
                chartFullscreen
                  ? "fixed inset-0 z-50 flex flex-col bg-[#ececec] p-3"
                  : undefined
              }
            >
              {chartFullscreen && (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{tree.name}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5"
                    onClick={() => setChartFullscreen(false)}
                  >
                    <Minimize2 className="h-4 w-4" />
                    {t("chart.exitFullscreen")}
                  </Button>
                </div>
              )}
            <Card className={chartFullscreen ? "flex-1 overflow-hidden" : "overflow-hidden"}>
              <CardContent className={chartFullscreen ? "h-full p-2 sm:p-3 min-w-0 overflow-hidden" : "p-2 sm:p-3 min-w-0 overflow-hidden"}>
                {(chartView === "family" || chartView === "close") && (
                  chartView === "close" && closeFocusId == null ? (
                    <p className="py-16 text-center text-sm text-muted-foreground">
                      {t("chart.pickFocus")}
                    </p>
                  ) : (
                  <FamilyChart
                    key={`${chartRevision}-${chartView}-${closeFocusId ?? "all"}-${maxGenerations}`}
                    people={familyViewData.people}
                    rels={familyViewData.rels}
                    branches={branches}
                    remotePeople={remotePeople}
                    focusMode={chartFocusId != null || chartView === "close"}
                    selectedPersonId={detailPerson?.id ?? null}
                    onPersonClick={(p) => setDetailPerson(p)}
                    onOpenSideTree={(p) => void openPersonTree(p.id)}
                    onQuickAdd={
                      canWrite ? (p) => openAddRelative(p.id, "son") : undefined
                    }
                    onToggleBranch={
                      canWrite
                        ? (branchId, isHidden) =>
                            toggleBranchMut.mutate({ treeId, branchId, isHidden })
                        : undefined
                    }
                  />
                  )
                )}
                {chartView === "pedigree" && (
                  (() => {
                    const focusId =
                      chartFocusId ??
                      detailPerson?.id ??
                      chartPeople.find((p) => p.gender !== "female")?.id ??
                      chartPeople[0]?.id;
                    if (!focusId) {
                      return (
                        <p className="py-16 text-center text-sm text-muted-foreground">
                          {t("chart.pickFocus")}
                        </p>
                      );
                    }
                    return (
                      <PedigreeView
                        people={chartPeople}
                        rels={chartRels}
                        focusId={focusId}
                        selectedPersonId={detailPerson?.id ?? null}
                        onPersonClick={(p) => {
                          setDetailPerson(p);
                          setChartFocusId(p.id);
                        }}
                        onAddParent={
                          canWrite
                            ? (childId, role) => openAddRelative(childId, role)
                            : undefined
                        }
                      />
                    );
                  })()
                )}
                {chartView === "fan" && (
                  (() => {
                    const focusId =
                      chartFocusId ??
                      detailPerson?.id ??
                      chartPeople.find((p) => p.gender !== "female")?.id ??
                      chartPeople[0]?.id;
                    if (!focusId) {
                      return (
                        <p className="py-16 text-center text-sm text-muted-foreground">
                          {t("chart.pickFocus")}
                        </p>
                      );
                    }
                    return (
                      <FanChartView
                        people={chartPeople}
                        rels={chartRels}
                        focusId={focusId}
                        selectedPersonId={detailPerson?.id ?? null}
                        onPersonClick={(p) => {
                          setDetailPerson(p);
                          setChartFocusId(p.id);
                        }}
                        onAddParent={
                          canWrite
                            ? (childId, role) => openAddRelative(childId, role)
                            : undefined
                        }
                      />
                    );
                  })()
                )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardContent className="p-4">
                <div className="relative mb-4 max-w-sm">
                  <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t("tree.searchPh")}
                    className="pe-9"
                  />
                </div>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("tree.cols.name")}</TableHead>
                        <TableHead>{t("tree.cols.relation")}</TableHead>
                        <TableHead>{t("tree.cols.nasab")}</TableHead>
                        <TableHead>{t("tree.cols.kunya")}</TableHead>
                        <TableHead>{t("tree.cols.gender")}</TableHead>
                        <TableHead>{t("tree.cols.years")}</TableHead>
                        <TableHead>{t("tree.cols.privacy")}</TableHead>
                        {canWrite && <TableHead>{t("tree.cols.actions")}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                            {t("tree.noResults")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((p) => (
                          <TableRow key={p.id} className="cursor-pointer" onClick={() => setDetailPerson(p)}>
                            <TableCell className="font-bold">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`flex h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ${
                                    p.gender === "female" ? "ring-pink-300 bg-pink-100" : "ring-sky-300 bg-sky-100"
                                  }`}
                                >
                                  {p.photoUrl ? (
                                    <img src={p.photoUrl} alt="" className="h-full w-full object-cover" />
                                  ) : (
                                    <span
                                      className={`flex h-full w-full items-center justify-center text-white text-xs ${
                                        p.gender === "female" ? "bg-pink-500" : "bg-sky-600"
                                      }`}
                                    >
                                      {p.givenName.slice(0, 1)}
                                    </span>
                                  )}
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate">{p.givenName}</span>
                                  {unlinkedIds.has(p.id) && (
                                    <Badge
                                      variant="outline"
                                      className="mt-0.5 text-[10px] text-amber-800 border-amber-300"
                                    >
                                      {t("relation.notInChart")} #{p.id}
                                    </Badge>
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {listFocusId != null
                                ? t(
                                    `tree.rel.${relationToFocus(listFocusId, p.id, people, rels)}`,
                                  )
                                : "—"}
                            </TableCell>
                            <TableCell className="font-display text-muted-foreground">{p.fatherName ?? "—"}</TableCell>
                            <TableCell>{p.kunya ?? "—"}</TableCell>
                            <TableCell>{p.gender === "female" ? t("common.female") : t("common.male")}</TableCell>
                            <TableCell className="text-xs">{L.formatYears(p.birthYear, p.deathYear, p.isLiving) || "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{L.privacy[p.privacy as PersonPrivacy]}</Badge>
                            </TableCell>
                            {canWrite && (
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" title={t("common.edit")} onClick={() => setEditPerson(p)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" title={t("common.link")} onClick={() => setLinkAnchor(p)}>
                                    <Link2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" title={t("common.delete")} className="text-destructive" onClick={() => setDeletePerson(p)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="photos">
            <PhotosGallery
              people={people}
              onPersonClick={(p) => setDetailPerson(p)}
            />
          </TabsContent>

          <TabsContent value="log">
            <Card>
              <CardContent className="p-6">
                {logQuery.isLoading ? (
                  <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
                ) : (logQuery.data?.length ?? 0) === 0 ? (
                  <p className="text-center text-muted-foreground py-10">{t("tree.noLogs")}</p>
                ) : (
                  <div className="space-y-0">
                    {logQuery.data!.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 border-b py-3 last:border-0">
                        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <History className="h-4 w-4" />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-bold">{log.userName ?? t("user")}</span>{" "}
                            <Badge variant="secondary" className="mx-1">{L.actionLabel(log.action)}</Badge>{" "}
                            {log.details}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{L.formatDate(log.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* الحوارات */}
      <PersonFormDialog
        treeId={treeId}
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) {
            setAddAnchorId(null);
            setAddKinship(null);
          }
        }}
        people={people}
        rels={rels}
        defaultAnchorId={addAnchorId}
        defaultKinship={addKinship}
        onAdded={refreshChart}
      />
      <PersonFormDialog
        treeId={treeId}
        open={!!editPerson}
        onOpenChange={(o) => !o && setEditPerson(null)}
        person={editPerson}
        people={people}
        rels={rels}
        onAdded={refreshChart}
      />
      <RelationDialog
        treeId={treeId}
        open={!!linkAnchor}
        onOpenChange={(o) => !o && setLinkAnchor(null)}
        people={people}
        rels={rels}
        anchor={linkAnchor}
        unlinkedIds={unlinkedIds}
        onLinked={refreshChart}
      />
      <CsvImportDialog treeId={treeId} open={importOpen} onOpenChange={setImportOpen} />

      {/* بطاقة الشخص */}
      <Sheet open={!!detailPerson} onOpenChange={(o) => !o && setDetailPerson(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0 gap-0">
          <div className="flex flex-col gap-4 p-4 pb-8">
          {detailPerson && (() => {
            const ranks = computePersonRanks(detailPerson, people, rels);
            const birthLabel = formatBirthDate(detailPerson, localeTag(i18n.language));
            const { fatherId, motherId } = getParents(
              detailPerson.id,
              rels,
              peopleById,
            );
            const father = fatherId ? peopleById.get(fatherId) : null;
            const mother = motherId ? peopleById.get(motherId) : null;
            const spouseIds = spousesOf.get(detailPerson.id) ?? [];
            const spouses = spouseIds
              .map((id) => peopleById.get(id))
              .filter((p): p is Person => !!p);
            const childIds = childrenOf.get(detailPerson.id) ?? [];
            const children = childIds
              .map((id) => peopleById.get(id))
              .filter((p): p is Person => !!p)
              .sort((a, b) => a.givenName.localeCompare(b.givenName, "ar"));
            const hasLinks = !!(father || mother || spouses.length || children.length);
            const timeline: Array<{ year: number | null; label: string; key: string }> = [];
            if (detailPerson.birthYear) {
              timeline.push({
                year: detailPerson.birthYear,
                label: birthLabel
                  ? `${t("tree.timelineBirth")} — ${birthLabel}`
                  : t("tree.timelineBirth"),
                key: "birth",
              });
            }
            for (const sp of spouses) {
              const rel = findSpouseRel(rels, detailPerson.id, sp.id);
              const y = rel?.marriageYear ?? null;
              timeline.push({
                year: y,
                label: t("tree.timelineMarriage", { name: sp.givenName }),
                key: `m-${sp.id}`,
              });
            }
            for (const ch of children) {
              timeline.push({
                year: ch.birthYear ?? null,
                label: t("tree.timelineChild", { name: ch.givenName }),
                key: `c-${ch.id}`,
              });
            }
            if (!detailPerson.isLiving && detailPerson.deathYear) {
              timeline.push({
                year: detailPerson.deathYear,
                label: t("tree.timelineDeath"),
                key: "death",
              });
            }
            timeline.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
            return (
            <>
              <SheetHeader className="text-start pe-8">
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-2xl ring-2 ${
                      detailPerson.gender === "female" ? "ring-pink-400" : "ring-blue-500"
                    }`}
                  >
                    {detailPerson.photoUrl ? (
                      <img src={detailPerson.photoUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span
                        className={`flex h-full w-full items-center justify-center text-2xl text-white ${
                          detailPerson.gender === "female" ? "bg-pink-600" : "bg-blue-600"
                        }`}
                      >
                        {detailPerson.gender === "female" ? "♀" : "♂"}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="font-display text-xl sm:text-2xl flex flex-wrap items-center gap-2">
                      <span className={!detailPerson.isLiving ? "line-through decoration-2 text-rose-900" : ""}>
                        {detailPerson.givenName}
                      </span>
                      <Badge variant={detailPerson.isLiving ? "default" : "destructive"}>
                        {detailPerson.isLiving ? t("detail.alive") : t("detail.dead")}
                      </Badge>
                    </SheetTitle>
                    <SheetDescription className="font-display text-sm sm:text-base break-words">
                      {detailPerson.fatherName ?? ""}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => void openPersonTree(detailPerson.id)}
                >
                  <Focus className="h-3.5 w-3.5" />
                  {t("detail.profileAction")}
                </Button>
                {canWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      setEditPerson(detailPerson);
                      setDetailPerson(null);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("common.edit")}
                  </Button>
                )}
                {canWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => openAddRelative(detailPerson.id, "son")}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {t("common.add")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setChartView("close");
                    setChartFocusId(detailPerson.id);
                  }}
                >
                  <Home className="h-3.5 w-3.5" />
                  {t("chart.viewClose")}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {detailPerson.kunya && <InfoRow label={t("detail.kunya")} value={detailPerson.kunya} />}
                {detailPerson.laqab && <InfoRow label={t("detail.laqab")} value={detailPerson.laqab} />}
                {detailPerson.clan && <InfoRow label={t("detail.clan")} value={detailPerson.clan} />}
                <InfoRow label={t("detail.gender")} value={detailPerson.gender === "female" ? t("common.female") : t("common.male")} />
                {birthLabel && <InfoRow label={t("detail.birth")} value={birthLabel} />}
                {detailPerson.birthPlace && (
                  <InfoRow label={t("detail.birthPlace")} value={detailPerson.birthPlace} />
                )}
                {!detailPerson.isLiving && detailPerson.deathYear && (
                  <InfoRow label={t("detail.death")} value={String(detailPerson.deathYear)} />
                )}
                {!detailPerson.isLiving && detailPerson.deathPlace && (
                  <InfoRow label={t("detail.deathPlace")} value={detailPerson.deathPlace} />
                )}
                <InfoRow label={t("detail.privacy")} value={L.privacy[detailPerson.privacy as PersonPrivacy]} />
              </div>
              {timeline.length > 0 && (
                <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                  <p className="text-sm font-semibold">{t("tree.timelineTitle")}</p>
                  <ol className="relative space-y-3 border-s-2 border-stone-200 ps-4">
                    {timeline.map((ev) => (
                      <li key={ev.key} className="relative text-sm">
                        <span className="absolute -start-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-sky-500 bg-white" />
                        {ev.year != null && (
                          <span className="me-2 font-semibold tabular-nums text-sky-700">
                            {ev.year}
                          </span>
                        )}
                        <span className="text-foreground/90">{ev.label}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="space-y-3 rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-sm dark:border-amber-900/40 dark:bg-amber-950/20">
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    {t("detail.linksTitle")}
                  </p>
                  {canWrite && (
                    <p className="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/80">
                      {t("detail.linksHint")}
                    </p>
                  )}
                </div>
                {!hasLinks ? (
                  <p className="text-xs text-muted-foreground">{t("detail.noLinks")}</p>
                ) : (
                  <ul className="space-y-2">
                    {father && (
                      <li className="flex flex-wrap items-center gap-2 rounded-lg bg-background/80 px-2.5 py-2">
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="text-muted-foreground">{t("detail.father")}: </span>
                          <button
                            type="button"
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                            onClick={() => void openPersonTree(father.id)}
                          >
                            {father.givenName}
                          </button>
                        </span>
                        {canWrite && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={unlinkMut.isPending}
                            onClick={() =>
                              unlinkParent(father.id, detailPerson.id, father.givenName)
                            }
                          >
                            <Unlink className="h-3.5 w-3.5" />
                            {t("detail.unlink")}
                          </Button>
                        )}
                      </li>
                    )}
                    {mother && (
                      <li className="flex flex-wrap items-center gap-2 rounded-lg bg-background/80 px-2.5 py-2">
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="text-muted-foreground">{t("detail.mother")}: </span>
                          <button
                            type="button"
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                            onClick={() => void openPersonTree(mother.id)}
                          >
                            {mother.givenName}
                          </button>
                        </span>
                        {canWrite && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={unlinkMut.isPending}
                            onClick={() =>
                              unlinkParent(mother.id, detailPerson.id, mother.givenName)
                            }
                          >
                            <Unlink className="h-3.5 w-3.5" />
                            {t("detail.unlink")}
                          </Button>
                        )}
                      </li>
                    )}
                    {spouses.map((sp) => (
                      <li
                        key={`sp-${sp.id}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-background/80 px-2.5 py-2"
                      >
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="text-muted-foreground">{t("detail.spouses")}: </span>
                          <button
                            type="button"
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                            onClick={() => void openPersonTree(sp.id)}
                          >
                            {sp.givenName}
                          </button>
                        </span>
                        {canWrite && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={unlinkMut.isPending}
                            onClick={() =>
                              unlinkSpouse(detailPerson.id, sp.id, sp.givenName)
                            }
                          >
                            <Unlink className="h-3.5 w-3.5" />
                            {t("detail.unlink")}
                          </Button>
                        )}
                      </li>
                    ))}
                    {children.map((ch) => (
                      <li
                        key={`ch-${ch.id}`}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-background/80 px-2.5 py-2"
                      >
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="text-muted-foreground">{t("detail.children")}: </span>
                          <button
                            type="button"
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                            onClick={() => void openPersonTree(ch.id)}
                          >
                            {ch.givenName}
                          </button>
                        </span>
                        {canWrite && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
                            disabled={unlinkMut.isPending}
                            onClick={() =>
                              unlinkParent(detailPerson.id, ch.id, ch.givenName)
                            }
                          >
                            <Unlink className="h-3.5 w-3.5" />
                            {t("detail.unlink")}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {(ranks.amongSiblings || ranks.amongGenderInTree || ranks.amongCousins) && (
                <PersonRankLines
                  ranks={ranks}
                  gender={detailPerson.gender}
                  t={t}
                  className="text-xs"
                />
              )}
              {detailPerson.notes && (
                <p className="rounded-lg bg-muted/50 p-3 text-sm leading-relaxed break-words">{detailPerson.notes}</p>
              )}
              <SheetFooter className="gap-2 flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-start">
                <Button
                  className="gap-2 w-full sm:w-auto"
                  variant={chartFocusId === detailPerson.id ? "secondary" : "default"}
                  onClick={() => void openPersonTree(detailPerson.id)}
                  disabled={ensureLineageMut.isPending}
                >
                  <Focus className="h-4 w-4" />
                  {chartFocusId === detailPerson.id
                    ? t("detail.viewingFocusedTree")
                    : ensureLineageMut.isPending
                      ? t("common.saving")
                      : t("detail.viewPersonTree")}
                </Button>
                {chartFocusId && (
                  <Button
                    className="gap-2 w-full sm:w-auto"
                    variant="outline"
                    onClick={() => setChartFocusId(null)}
                  >
                    {t("detail.viewFullTree")}
                  </Button>
                )}
              </SheetFooter>
              {canWrite && (
                <SheetFooter className="gap-2 flex-col-reverse sm:flex-row sm:flex-wrap sm:justify-start pt-0">
                  <Button
                    className="gap-2 w-full sm:w-auto"
                    onClick={() => openAddRelative(detailPerson.id, "son")}
                  >
                    <UserPlus className="h-4 w-4" /> {t("tree.addRelative")}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 w-full sm:w-auto"
                    onClick={() => { setLinkAnchor(detailPerson); setDetailPerson(null); }}
                  >
                    <Link2 className="h-4 w-4" /> {t("common.link")}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 w-full sm:w-auto"
                    onClick={() => { setEditPerson(detailPerson); setDetailPerson(null); }}
                  >
                    <Pencil className="h-4 w-4" /> {t("common.edit")}
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2 w-full sm:w-auto"
                    onClick={() => setDeletePerson(detailPerson)}
                  >
                    <Trash2 className="h-4 w-4" /> {t("common.delete")}
                  </Button>
                </SheetFooter>
              )}
            </>
            );
          })()}
                  </div>
        </SheetContent>
      </Sheet>

      {/* تأكيد الحذف */}
      <AlertDialog open={!!deletePerson} onOpenChange={(o) => !o && setDeletePerson(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tree.deleteTitle", { name: deletePerson?.givenName })}</AlertDialogTitle>
            <AlertDialogDescription>{t("tree.deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t("common.goBack")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePerson && deleteMut.mutate({ id: deletePerson.id, treeId })}
            >
              {t("tree.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* الإعدادات */}
      {canAdmin && treeStatus === "active" && (
        <TreeSettingsDialog
          treeId={treeId}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          tree={{
            name: tree.name,
            tribe: tree.tribe,
            region: tree.region,
            description: tree.description,
            visibility: tree.visibility as TreeVisibility,
            femaleDisplay: tree.femaleDisplay as FemaleDisplay,
            hideLiving: tree.hideLiving,
          }}
          myRole={myRole}
        />
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

/* ───────────── حوار إعدادات الشجرة ───────────── */
function TreeSettingsDialog({
  treeId,
  open,
  onOpenChange,
  tree,
  myRole,
}: {
  treeId: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tree: {
    name: string;
    tribe: string | null;
    region: string | null;
    description: string | null;
    visibility: TreeVisibility;
    femaleDisplay: FemaleDisplay;
    hideLiving: boolean;
  };
  myRole: TreeRole;
}) {
  const utils = trpc.useUtils();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const L = useLabels();
  const [name, setName] = useState(tree.name);
  const [tribe, setTribe] = useState(tree.tribe ?? "");
  const [region, setRegion] = useState(tree.region ?? "");
  const [description, setDescription] = useState(tree.description ?? "");
  const [visibility, setVisibility] = useState<TreeVisibility>(tree.visibility);
  const [femaleDisplay, setFemaleDisplay] = useState<FemaleDisplay>(tree.femaleDisplay);
  const [hideLiving, setHideLiving] = useState(tree.hideLiving);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const updateMut = trpc.tree.update.useMutation({
    onSuccess: async () => {
      toast.success(t("settings.saved"));
      await utils.tree.get.invalidate({ id: treeId });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.tree.remove.useMutation({
    onSuccess: async () => {
      toast.success(t("settings.deleted"));
      await utils.tree.listMine.invalidate();
      navigate("/dashboard");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto w-[calc(100%-1.5rem)]">
          <DialogHeader className="text-start pe-8">
            <DialogTitle className="font-display text-xl">{t("settings.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("settings.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("settings.tribe")}</Label>
                <Input value={tribe} onChange={(e) => setTribe(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("settings.region")}</Label>
                <Input value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("settings.desc")}</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>

            <div className="rounded-xl border p-4 space-y-4">
              <p className="font-bold text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" /> {t("settings.privacyTitle")}
              </p>
              <div className="space-y-2">
                <Label>{t("settings.whoSees")}</Label>
                <Select value={visibility} onValueChange={(v) => setVisibility(v as TreeVisibility)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(L.visibility) as TreeVisibility[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {L.visibility[k]} — {L.visibilityDescriptions[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("settings.femaleNames")}</Label>
                <Select value={femaleDisplay} onValueChange={(v) => setFemaleDisplay(v as FemaleDisplay)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(L.femaleDisplay) as FemaleDisplay[]).map((k) => (
                      <SelectItem key={k} value={k}>{L.femaleDisplay[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>{t("settings.hideLiving")}</Label>
                <Switch checked={hideLiving} onCheckedChange={setHideLiving} />
              </div>
            </div>

            {myRole === "owner" && (
              <div className="rounded-xl border border-destructive/40 p-4">
                <p className="font-bold text-sm text-destructive mb-2">{t("settings.danger")}</p>
                <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
                  {t("settings.deleteTree")}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button
              onClick={() =>
                updateMut.mutate({
                  id: treeId,
                  name: name.trim(),
                  tribe: tribe.trim() || null,
                  region: region.trim() || null,
                  description: description.trim() || null,
                  visibility,
                  femaleDisplay,
                  hideLiving,
                })
              }
              disabled={!name.trim() || updateMut.isPending}
            >
              {updateMut.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settings.deleteTreeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("settings.deleteTreeBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t("common.goBack")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMut.mutate({ id: treeId })}
            >
              {t("settings.deleteTreeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
