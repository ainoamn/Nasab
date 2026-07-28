import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
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
import TodayEventsBanner from "@/components/tree/TodayEventsBanner";
import DiscoveriesPanel from "@/components/tree/DiscoveriesPanel";
import PersonGapsStrip from "@/components/tree/PersonGapsStrip";
import ImmediateFamilyStrip from "@/components/tree/ImmediateFamilyStrip";
import BirthOrderStrip from "@/components/tree/BirthOrderStrip";
import TwinFamilyPanel from "@/components/tree/TwinFamilyPanel";
import PersonShareQrDialog from "@/components/tree/PersonShareQrDialog";
import PathToHomeStrip from "@/components/tree/PathToHomeStrip";
import PlacesBrowser from "@/components/tree/PlacesBrowser";
import OccasionsPanel from "@/components/tree/OccasionsPanel";
import OccasionsScopeChips from "@/components/tree/OccasionsScopeChips";
import ResearchTourStrip from "@/components/tree/ResearchTourStrip";
import DescendantsView from "@/components/tree/DescendantsView";
import QuickAddMenu from "@/components/tree/QuickAddMenu";
import RelationPathDialog from "@/components/tree/RelationPathDialog";
import KinshipCertificateDialog from "@/components/tree/KinshipCertificateDialog";
import PersonProfilePrintDialog from "@/components/tree/PersonProfilePrintDialog";
import PersonFormDialog from "@/components/tree/PersonFormDialog";
import RelationDialog from "@/components/tree/RelationDialog";
import CsvImportDialog from "@/components/tree/CsvImportDialog";
import GedcomImportDialog from "@/components/tree/GedcomImportDialog";
import RecentPeopleStrip from "@/components/tree/RecentPeopleStrip";
import FavoritesStrip from "@/components/tree/FavoritesStrip";
import FavoriteRelatesStrip from "@/components/tree/FavoriteRelatesStrip";
import RecentRelatesStrip from "@/components/tree/RecentRelatesStrip";
import OccasionCardPrintDialog from "@/components/tree/OccasionCardPrintDialog";
import FamilyBriefPrintDialog from "@/components/tree/FamilyBriefPrintDialog";
import ConsistencyTourStrip from "@/components/tree/ConsistencyTourStrip";
import TreeGrowthChecklist from "@/components/tree/TreeGrowthChecklist";
import SpouseDatesDialog from "@/components/tree/SpouseDatesDialog";
import ShortcutsDialog from "@/components/tree/ShortcutsDialog";
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
import { getHomePersonId, setHomePersonId } from "@/lib/homePerson";
import { computeTreeCompleteness } from "@/lib/treeCompleteness";
import {
  classifyRelationPath,
  findCommonAncestorId,
  findRelationPath,
} from "@/lib/relationPath";
import { buildPersonGapsMap, findPersonGaps, type PersonGap } from "@/lib/personGaps";
import {
  getRecentPersonIds,
  pushRecentPersonId,
} from "@/lib/recentPeople";
import {
  getRecentRelates,
  pushRecentRelate,
  type RecentRelatePair,
} from "@/lib/recentRelates";
import {
  getFavoriteRelates,
  toggleFavoriteRelate,
  type FavoriteRelatePair,
} from "@/lib/favoriteRelates";
import { formatFamilyBrief } from "@/lib/familyBrief";
import { buildResearchTourItems } from "@/lib/researchTour";
import {
  getResearchTourState,
  setResearchTourState,
  type ResearchTourScope,
} from "@/lib/researchTourState";
import {
  getConsistencyTourState,
  setConsistencyTourState,
  type ConsistencyTourScope,
} from "@/lib/consistencyTourState";
import {
  getFavoritePersonIds,
  toggleFavoritePersonId,
} from "@/lib/favoritePeople";
import {
  clearDismissedDiscoveries,
  dismissDiscoveryKey,
  getDismissedDiscoveryKeys,
} from "@/lib/dismissedDiscoveries";
import {
  absoluteUrl,
  buildPrintRootPath,
  buildPrintTemplatePath,
  buildSharePersonPath,
  buildTreePersonPath,
  parseChartViewParam,
  parseMainTabParam,
  parsePersonIdParam,
} from "@/lib/treeUrl";
import {
  buildOccasionIcs,
  buildMultiOccasionIcs,
  downloadIcs,
  occasionGreetingText,
} from "@/lib/occasionShare";
import { openWhatsAppShare } from "@/lib/whatsAppShare";
import type { TreeOccasion } from "@/lib/treeOccasions";
import { buildTreeOccasions } from "@/lib/treeOccasions";
import {
  getOccasionsScope,
  setOccasionsScope,
  type OccasionsScope,
} from "@/lib/occasionsScope";
import {
  formatPersonShareCard,
  formatRelationPathText,
} from "@/lib/relationShare";
import {
  downloadPersonJson,
  downloadPersonVCard,
} from "@/lib/personExport";
import { downloadOccasionsCsv } from "@/lib/occasionsCsv";
import { formatPersonGapsDigest } from "@/lib/researchDigest";
import { localeTag } from "@/i18n";
import type {
  TreeRole,
  TreeStatus,
  TreeVisibility,
  FemaleDisplay,
  PersonPrivacy,
} from "@contracts/constants";
import type { Person, Relationship } from "@db/tables";
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
  ArrowDownToLine,
  GitCompareArrows,
  House,
  Keyboard,
  FileDown,
  Rows3,
  Rows2,
  ChevronLeft,
  ChevronRight,
  Star,
  Link as LinkIcon,
  MapPin,
  Gift,
  Copy,
  Contact,
  MessageCircle,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { findSpouseRel } from "@/lib/spouseMeta";
import { cn } from "@/lib/utils";

export default function TreeWorkspace() {
  const { id } = useParams<{ id: string }>();
  const treeId = parseInt(id ?? "0", 10);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const { t, i18n } = useTranslation();
  const L = useLabels();

  const [addOpen, setAddOpen] = useState(false);
  const [addAnchorId, setAddAnchorId] = useState<number | null>(null);
  const [addKinship, setAddKinship] = useState<
    "father" | "mother" | "son" | "daughter" | "spouse" | "brother" | "sister" | null
  >(null);
  const [addTwinOfId, setAddTwinOfId] = useState<number | null>(null);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [detailPerson, setDetailPerson] = useState<Person | null>(null);
  const [deletePerson, setDeletePerson] = useState<Person | null>(null);
  const [linkAnchor, setLinkAnchor] = useState<Person | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [gedcomImportOpen, setGedcomImportOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [listGender, setListGender] = useState<"all" | "male" | "female">("all");
  const [listLiving, setListLiving] = useState<"all" | "living" | "deceased">("all");
  const [listUnlinkedOnly, setListUnlinkedOnly] = useState(false);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [recentRelatePairs, setRecentRelatePairs] = useState<RecentRelatePair[]>(
    [],
  );
  const [favoriteRelatePairs, setFavoriteRelatePairs] = useState<
    FavoriteRelatePair[]
  >([]);
  const [profilePrintPerson, setProfilePrintPerson] = useState<Person | null>(
    null,
  );
  const [printOccasion, setPrintOccasion] = useState<TreeOccasion | null>(null);
  const [familyBriefPrintOpen, setFamilyBriefPrintOpen] = useState(false);
  const [qrPerson, setQrPerson] = useState<Person | null>(null);
  const [dismissedDiscoveryKeys, setDismissedDiscoveryKeys] = useState<string[]>([]);
  const [completenessOpen, setCompletenessOpen] = useState(false);
  const [chartFocusId, setChartFocusId] = useState<number | null>(null);
  const [chartRevision, setChartRevision] = useState(0);
  const [chartView, setChartView] = useState<
    "family" | "close" | "pedigree" | "fan" | "descendants"
  >("family");
  const [chartFullscreen, setChartFullscreen] = useState(false);
  const [maxGenerations, setMaxGenerations] = useState(8);
  const [howRelatedOpen, setHowRelatedOpen] = useState(false);
  const [howRelatedPair, setHowRelatedPair] = useState<{
    from: number | null;
    to: number | null;
  }>({ from: null, to: null });
  const [kinshipCertPair, setKinshipCertPair] = useState<{
    from: number | null;
    to: number | null;
  }>({ from: null, to: null });
  const [kinshipCertOpen, setKinshipCertOpen] = useState(false);
  const [chartCompact, setChartCompact] = useState(false);
  const [spouseEdit, setSpouseEdit] = useState<{
    rel: Relationship;
    a: Person;
    b: Person;
  } | null>(null);
  const [homePersonId, setHomePersonIdState] = useState<number | null>(null);
  const [occasionsScope, setOccasionsScopeState] =
    useState<OccasionsScope>("close");
  const [researchTourScope, setResearchTourScope] =
    useState<ResearchTourScope>("close");
  const [consistencyTourScope, setConsistencyTourScope] =
    useState<ConsistencyTourScope>("close");
  const [focusTrail, setFocusTrail] = useState<number[]>([]);
  const [highlightPathIds, setHighlightPathIds] = useState<number[] | null>(null);
  const [urlRelateId, setUrlRelateId] = useState<number | null>(null);
  const [mainTab, setMainTab] = useState("chart");
  const [centerRequest, setCenterRequest] = useState<{
    personId: number;
    token: number;
  } | null>(null);
  const centerTokenRef = useRef(0);
  const urlBootstrappedRef = useRef(false);

  const requestCenterOn = (personId: number) => {
    centerTokenRef.current += 1;
    setCenterRequest({ personId, token: centerTokenRef.current });
  };

  useEffect(() => {
    if (treeId > 0) setHomePersonIdState(getHomePersonId(treeId));
  }, [treeId]);

  useEffect(() => {
    if (treeId > 0) {
      setRecentIds(getRecentPersonIds(treeId));
      setFavoriteIds(getFavoritePersonIds(treeId));
      setDismissedDiscoveryKeys(getDismissedDiscoveryKeys(treeId));
      setOccasionsScopeState(getOccasionsScope(treeId));
      setRecentRelatePairs(getRecentRelates(treeId));
      setFavoriteRelatePairs(getFavoriteRelates(treeId));
      setResearchTourScope(getResearchTourState(treeId).scope);
      setConsistencyTourScope(getConsistencyTourState(treeId).scope);
    }
  }, [treeId]);

  useEffect(() => {
    urlBootstrappedRef.current = false;
  }, [treeId]);

  useEffect(() => {
    if (!detailPerson || treeId <= 0) return;
    pushRecentPersonId(treeId, detailPerson.id);
    setRecentIds(getRecentPersonIds(treeId));
  }, [detailPerson?.id, treeId]);

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

  /** قراءة ?person=&relate=&view=&tab= مرة واحدة بعد تحميل الأفراد */
  useEffect(() => {
    if (urlBootstrappedRef.current) return;
    if (dataQuery.isLoading || people.length === 0) {
      if (!dataQuery.isLoading && people.length === 0) {
        urlBootstrappedRef.current = true;
      }
      return;
    }
    urlBootstrappedRef.current = true;
    const pid = parsePersonIdParam(searchParams.get("person"));
    const relateId = parsePersonIdParam(searchParams.get("relate"));
    const view = parseChartViewParam(searchParams.get("view"));
    const tab = parseMainTabParam(searchParams.get("tab"));
    if (view) setChartView(view);
    if (tab) setMainTab(tab);
    if (pid != null && peopleById.has(pid)) {
      const p = peopleById.get(pid)!;
      setDetailPerson(p);
      setChartFocusId(pid);
      requestCenterOn(pid);
    }
    if (
      pid != null &&
      relateId != null &&
      pid !== relateId &&
      peopleById.has(pid) &&
      peopleById.has(relateId)
    ) {
      const path = findRelationPath(pid, relateId, people, rels);
      if (path && path.length > 1) {
        setUrlRelateId(relateId);
        setHighlightPathIds(path.map((h) => h.personId));
        setChartView("family");
        setMainTab("chart");
        const label = classifyRelationPath(
          pid,
          relateId,
          people,
          rels,
          path,
        );
        toast.success(
          t("tree.pathLinkOpened", {
            rel: t(`tree.rel.${label}`),
            count: path.length,
          }),
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per tree load
  }, [dataQuery.isLoading, people.length, peopleById]);

  /** مزامنة الرابط العميق مع التحديد والعرض */
  useEffect(() => {
    if (!urlBootstrappedRef.current) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (detailPerson) next.set("person", String(detailPerson.id));
        else next.delete("person");
        if (urlRelateId != null) next.set("relate", String(urlRelateId));
        else next.delete("relate");
        if (chartView !== "family") next.set("view", chartView);
        else next.delete("view");
        if (mainTab !== "chart") next.set("tab", mainTab);
        else next.delete("tab");
        const a = next.toString();
        const b = prev.toString();
        return a === b ? prev : next;
      },
      { replace: true },
    );
  }, [detailPerson?.id, chartView, mainTab, urlRelateId, setSearchParams]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (e.key === "Escape") {
        if (chartFullscreen) {
          setChartFullscreen(false);
          return;
        }
        if (howRelatedOpen) {
          setHowRelatedOpen(false);
          return;
        }
        if (shortcutsOpen) {
          setShortcutsOpen(false);
          return;
        }
        if (highlightPathIds) {
          setHighlightPathIds(null);
          setUrlRelateId(null);
          return;
        }
        if (detailPerson) {
          setDetailPerson(null);
          return;
        }
        return;
      }
      if (typing) return;
      if (e.key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        document.getElementById("chart-person-search")?.focus();
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (e.key === "h" || e.key === "H") {
        const hid = homePersonId ?? getHomePersonId(treeId);
        if (hid != null && peopleById.has(hid)) {
          const p = peopleById.get(hid)!;
          setDetailPerson(p);
          setChartFocusId(hid);
          requestCenterOn(hid);
        } else {
          toast.message(t("tree.noHomePerson"));
        }
        return;
      }
      if (e.key === "r" || e.key === "R") {
        setHowRelatedOpen(true);
        return;
      }
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        (
          document.querySelector(
            "[data-research-next]",
          ) as HTMLButtonElement | null
        )?.click();
        return;
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        (
          document.querySelector(
            "[data-consistency-next]",
          ) as HTMLButtonElement | null
        )?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    chartFullscreen,
    howRelatedOpen,
    shortcutsOpen,
    highlightPathIds,
    detailPerson,
    homePersonId,
    treeId,
    peopleById,
    t,
  ]);

  const spousesOf = useMemo(() => buildSpousesOf(rels), [rels]);
  const childrenOf = useMemo(() => buildChildrenOf(rels), [rels]);

  /** ← → بين الإخوة أثناء فتح لوحة التفاصيل (متوافق مع RTL) */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (!detailPerson) return;
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.tagName === "SELECT" ||
        el?.isContentEditable;
      if (typing) return;
      if (howRelatedOpen || shortcutsOpen) return;

      const { fatherId, motherId } = getParents(
        detailPerson.id,
        rels,
        peopleById,
      );
      const siblingIds = new Set<number>();
      siblingIds.add(detailPerson.id);
      for (const pid of [fatherId, motherId]) {
        if (pid == null) continue;
        for (const sid of childrenOf.get(pid) ?? []) siblingIds.add(sid);
      }
      const ring = [...siblingIds]
        .map((id) => peopleById.get(id))
        .filter((p): p is Person => !!p)
        .sort((a, b) => a.givenName.localeCompare(b.givenName, "ar"));
      if (ring.length < 2) return;
      const idx = ring.findIndex((s) => s.id === detailPerson.id);
      if (idx < 0) return;
      const rtl = document.documentElement.dir === "rtl";
      const goPrev = rtl ? e.key === "ArrowLeft" : e.key === "ArrowRight";
      const next = goPrev
        ? ring[(idx - 1 + ring.length) % ring.length]
        : ring[(idx + 1) % ring.length];
      e.preventDefault();
      setDetailPerson(next);
      setChartFocusId(next.id);
      requestCenterOn(next.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    detailPerson,
    rels,
    peopleById,
    childrenOf,
    howRelatedOpen,
    shortcutsOpen,
  ]);

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
    setChartFocusId((prev) => {
      if (prev != null && prev !== personId) {
        setFocusTrail((trail) =>
          [prev, ...trail.filter((id) => id !== prev && id !== personId)].slice(
            0,
            8,
          ),
        );
      }
      return personId;
    });
    setChartRevision((n) => n + 1);
    setDetailPerson(null);
    requestCenterOn(personId);
  };

  /** إظهار شخص على المخطط من القائمة/التفاصيل/القفزات */
  const revealOnChart = (person: Person) => {
    setMainTab("chart");
    setDetailPerson(person);
    if (
      chartView === "pedigree" ||
      chartView === "fan" ||
      chartView === "descendants" ||
      chartView === "close"
    ) {
      setChartFocusId(person.id);
    }
    requestCenterOn(person.id);
  };

  const kinshipFocusForViews =
    chartFocusId ?? homePersonId ?? detailPerson?.id ?? null;

  const openHowRelatedFrom = (p: Person) => {
    setHowRelatedPair({
      from: kinshipFocusForViews,
      to: p.id,
    });
    setHowRelatedOpen(true);
  };

  const goBackFocus = () => {
    setFocusTrail((trail) => {
      if (trail.length === 0) {
        setChartFocusId(null);
        return trail;
      }
      const [prev, ...rest] = trail;
      setChartFocusId(prev);
      requestCenterOn(prev);
      return rest;
    });
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

  const linkTwinMut = trpc.person.linkTwin.useMutation({
    onSuccess: async () => {
      toast.success(t("twins.linked"));
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

  const listFocusId =
    homePersonId ?? chartFocusId ?? detailPerson?.id ?? people[0]?.id ?? null;

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
    setAddTwinOfId(null);
    setDetailPerson(null);
    setAddOpen(true);
  };

  const openAddTwin = (personId: number) => {
    const p = peopleById.get(personId);
    setAddAnchorId(personId);
    setAddKinship(p?.gender === "female" ? "sister" : "brother");
    setAddTwinOfId(personId);
    setDetailPerson(null);
    setAddOpen(true);
  };

  const fixResearchGap = (person: Person, kind: PersonGap["kind"]) => {
    if (kind === "noPhoto" || kind === "noBirthYear") {
      setEditPerson(person);
      setDetailPerson(null);
      return;
    }
    if (kind === "missingFather" || kind === "missingBothParents") {
      openAddRelative(person.id, "father");
      return;
    }
    if (kind === "missingMother") {
      openAddRelative(person.id, "mother");
      return;
    }
    if (kind === "childNoSpouseLink") {
      openAddRelative(person.id, "spouse");
    }
  };

  const rememberRelate = (fromId: number, toId: number) => {
    setRecentRelatePairs(pushRecentRelate(treeId, fromId, toId));
  };

  const copyPathLink = (fromId: number, toId: number) => {
    const url = absoluteUrl(
      buildTreePersonPath(treeId, fromId, { relate: toId, tab: "chart" }),
    );
    void navigator.clipboard.writeText(url);
    setUrlRelateId(toId);
    rememberRelate(fromId, toId);
    toast.success(t("tree.pathLinkCopied"));
  };

  const { occasionsPeople, occasionsRels } = useMemo(() => {
    if (occasionsScope === "all") {
      return { occasionsPeople: people, occasionsRels: rels };
    }
    if (occasionsScope === "favorites") {
      const ids = new Set(favoriteIds);
      if (homePersonId != null) ids.add(homePersonId);
      return {
        occasionsPeople: people.filter((p) => ids.has(p.id)),
        occasionsRels: rels.filter(
          (r) => ids.has(r.fromPersonId) && ids.has(r.toPersonId),
        ),
      };
    }
    const focus =
      homePersonId ?? chartFocusId ?? detailPerson?.id ?? people[0]?.id ?? null;
    if (focus == null) return { occasionsPeople: people, occasionsRels: rels };
    const close = collectCloseFamily(focus, people, rels);
    return { occasionsPeople: close.people, occasionsRels: close.rels };
  }, [
    occasionsScope,
    people,
    rels,
    favoriteIds,
    homePersonId,
    chartFocusId,
    detailPerson?.id,
  ]);

  const researchTourAllowedIds = useMemo(() => {
    if (researchTourScope === "all") return null;
    if (researchTourScope === "favorites") {
      const ids = new Set(favoriteIds);
      if (homePersonId != null) ids.add(homePersonId);
      return ids;
    }
    const focus =
      homePersonId ?? chartFocusId ?? detailPerson?.id ?? people[0]?.id ?? null;
    if (focus == null) return null;
    return new Set(
      collectCloseFamily(focus, people, rels).people.map((p) => p.id),
    );
  }, [
    researchTourScope,
    favoriteIds,
    homePersonId,
    chartFocusId,
    detailPerson?.id,
    people,
    rels,
  ]);

  const consistencyTourAllowedIds = useMemo(() => {
    if (consistencyTourScope === "all") return null;
    if (consistencyTourScope === "favorites") {
      const ids = new Set(favoriteIds);
      if (homePersonId != null) ids.add(homePersonId);
      return ids;
    }
    const focus =
      homePersonId ?? chartFocusId ?? detailPerson?.id ?? people[0]?.id ?? null;
    if (focus == null) return null;
    return new Set(
      collectCloseFamily(focus, people, rels).people.map((p) => p.id),
    );
  }, [
    consistencyTourScope,
    favoriteIds,
    homePersonId,
    chartFocusId,
    detailPerson?.id,
    people,
    rels,
  ]);

  const copyPathText = (fromId: number, toId: number) => {
    const from = peopleById.get(fromId);
    const to = peopleById.get(toId);
    if (!from || !to) return;
    const hops = findRelationPath(fromId, toId, people, rels);
    if (!hops || hops.length < 2) {
      toast.error(t("tree.howRelatedNone"));
      return;
    }
    const relKey = classifyRelationPath(fromId, toId, people, rels, hops);
    const url = absoluteUrl(
      buildTreePersonPath(treeId, fromId, { relate: toId, tab: "chart" }),
    );
    const viaLabel = (via: "parent" | "child" | "spouse") => {
      if (via === "parent") return t("tree.pathViaParent");
      if (via === "child") return t("tree.pathViaChild");
      return t("tree.pathViaSpouse");
    };
    const text = formatRelationPathText({
      fromName: from.givenName,
      toName: to.givenName,
      relationLabel: t(`tree.rel.${relKey}`),
      hops,
      peopleById,
      viaLabel,
      url,
      commonAncestorName:
        (() => {
          const id = findCommonAncestorId(hops);
          return id != null ? peopleById.get(id)?.givenName ?? null : null;
        })(),
      labels: {
        headline: t("tree.pathTextHeadline"),
        hopsHeader: t("tree.pathTextHops"),
        linkHeader: t("tree.pathTextLink"),
        commonAncestor: t("tree.commonAncestorAt"),
      },
    });
    void navigator.clipboard.writeText(text);
    setUrlRelateId(toId);
    rememberRelate(fromId, toId);
    toast.success(t("tree.pathTextCopied"));
  };

  const sharePathWhatsApp = (fromId: number, toId: number) => {
    const from = peopleById.get(fromId);
    const to = peopleById.get(toId);
    if (!from || !to) return;
    const hops = findRelationPath(fromId, toId, people, rels);
    if (!hops || hops.length < 2) {
      toast.error(t("tree.howRelatedNone"));
      return;
    }
    const relKey = classifyRelationPath(fromId, toId, people, rels, hops);
    const url = absoluteUrl(
      buildTreePersonPath(treeId, fromId, { relate: toId, tab: "chart" }),
    );
    const viaLabel = (via: "parent" | "child" | "spouse") => {
      if (via === "parent") return t("tree.pathViaParent");
      if (via === "child") return t("tree.pathViaChild");
      return t("tree.pathViaSpouse");
    };
    const text = formatRelationPathText({
      fromName: from.givenName,
      toName: to.givenName,
      relationLabel: t(`tree.rel.${relKey}`),
      hops,
      peopleById,
      viaLabel,
      url,
      commonAncestorName:
        (() => {
          const id = findCommonAncestorId(hops);
          return id != null ? peopleById.get(id)?.givenName ?? null : null;
        })(),
      labels: {
        headline: t("tree.pathTextHeadline"),
        hopsHeader: t("tree.pathTextHops"),
        linkHeader: t("tree.pathTextLink"),
        commonAncestor: t("tree.commonAncestorAt"),
      },
    });
    openWhatsAppShare(text);
    setUrlRelateId(toId);
    rememberRelate(fromId, toId);
    toast.success(t("tree.whatsAppOpened"));
  };

  const buildPersonCardText = (person: Person): string => {
    const url = absoluteUrl(
      buildTreePersonPath(treeId, person.id, { tab: "chart" }),
    );
    let relationLabel: string | null = null;
    let homeName: string | null = null;
    let hopNames: string[] | undefined;
    if (homePersonId != null && homePersonId !== person.id) {
      const home = peopleById.get(homePersonId);
      if (home) {
        homeName = home.givenName;
        const hops = findRelationPath(homePersonId, person.id, people, rels);
        const key = classifyRelationPath(
          homePersonId,
          person.id,
          people,
          rels,
          hops,
        );
        relationLabel = t(`tree.rel.${key}`);
        if (hops && hops.length > 1) {
          hopNames = hops
            .map((h) => peopleById.get(h.personId)?.givenName)
            .filter((n): n is string => !!n);
        }
      }
    }
    return formatPersonShareCard({
      person,
      relationLabel,
      homeName,
      hopNames,
      url,
      labels: {
        kinship: t("tree.personCardKinship"),
        pathHeader: t("tree.pathTextHops"),
        linkHeader: t("tree.pathTextLink"),
      },
    });
  };

  const copyPersonCard = (person: Person) => {
    void navigator.clipboard.writeText(buildPersonCardText(person));
    toast.success(t("tree.personCardCopied"));
  };

  const sharePersonWhatsApp = (person: Person) => {
    openWhatsAppShare(buildPersonCardText(person));
    toast.success(t("tree.whatsAppOpened"));
  };

  const occasionIcsTitle = (ev: TreeOccasion) => {
    if (ev.kind === "birthday") {
      return t("tree.icsBirthdayTitle", {
        name: ev.person?.givenName ?? ev.label,
      });
    }
    if (ev.kind === "memorial") {
      return t("tree.icsMemorialTitle", {
        name: ev.person?.givenName ?? ev.label,
      });
    }
    return t("tree.icsAnniversaryTitle", { name: ev.label });
  };

  const shareOccasionCalendar = (ev: TreeOccasion) => {
    if (!ev.person) return;
    const personUrl = absoluteUrl(
      buildTreePersonPath(treeId, ev.person.id, { tab: "chart" }),
    );
    const content = buildOccasionIcs(ev, {
      title: occasionIcsTitle(ev),
      description: t("tree.icsDescription", { url: personUrl }),
      url: personUrl,
    });
    downloadIcs(`nasab-${ev.key}`, content);
    toast.success(t("tree.icsDownloaded"));
  };

  const buildGreetingForOccasion = (ev: TreeOccasion): string | null => {
    if (!ev.person) return null;
    const personUrl = absoluteUrl(
      buildTreePersonPath(treeId, ev.person.id, { tab: "chart" }),
    );
    return occasionGreetingText(ev.kind, ev.person.givenName, personUrl, {
      birthday: t("tree.greetingBirthday"),
      anniversary: t("tree.greetingAnniversary"),
      memorial: t("tree.greetingMemorial"),
    });
  };

  const shareOccasionGreeting = (ev: TreeOccasion) => {
    const text = buildGreetingForOccasion(ev);
    if (!text) return;
    void navigator.clipboard.writeText(text);
    toast.success(t("tree.greetingCopied"));
  };

  const shareOccasionWhatsApp = (ev: TreeOccasion) => {
    const text = buildGreetingForOccasion(ev);
    if (!text) return;
    openWhatsAppShare(text);
    toast.success(t("tree.whatsAppOpened"));
  };

  const downloadUpcomingOccasionsCalendar = () => {
    const upcoming = buildTreeOccasions(
      occasionsPeople,
      occasionsRels,
    ).filter((e) => e.daysUntil <= 90);
    if (upcoming.length === 0) {
      toast.error(t("tree.occasionsDownloadEmpty"));
      return;
    }
    const items = upcoming.map((ev) => {
      const personUrl = ev.person
        ? absoluteUrl(
            buildTreePersonPath(treeId, ev.person.id, { tab: "chart" }),
          )
        : undefined;
      return {
        ev,
        title: occasionIcsTitle(ev),
        description: t("tree.icsDescription", {
          url: personUrl ?? "",
        }),
        url: personUrl,
      };
    });
    downloadIcs(
      `nasab-occasions-${occasionsScope}-90d`,
      buildMultiOccasionIcs(items),
    );
    toast.success(t("tree.occasionsDownloadDone", { count: upcoming.length }));
  };

  const buildFamilyBriefText = () => {
    const all = buildTreeOccasions(occasionsPeople, occasionsRels);
    const today = all.filter((e) => e.daysUntil === 0);
    const week = all.filter((e) => e.daysUntil > 0 && e.daysUntil <= 7);
    const gaps = buildPersonGapsMap(people, rels, { skipNoPhoto: true });
    const researchItems = buildResearchTourItems(
      gaps,
      peopleById,
      dismissedDiscoveryKeys,
      {
        homeId: homePersonId,
        favoriteIds,
        recentIds,
        allowedPersonIds: researchTourAllowedIds,
      },
    );
    const top = researchItems.slice(0, 5);
    return formatFamilyBrief({
      today,
      week,
      researchCount: researchItems.length,
      researchItems: top.map((item) => ({
        name: item.personName,
        gapLabel: t(`detail.gap.${item.kind}`),
        url: absoluteUrl(
          buildTreePersonPath(treeId, item.personId, { tab: "chart" }),
        ),
      })),
      urlFor: (ev) =>
        ev.person
          ? absoluteUrl(
              buildTreePersonPath(treeId, ev.person.id, { tab: "chart" }),
            )
          : null,
      labels: {
        title: t("tree.familyBriefTitle"),
        todayHeader: t("tree.familyBriefToday"),
        weekHeader: t("tree.familyBriefWeek"),
        emptyToday: t("tree.familyBriefEmptyToday"),
        emptyWeek: t("tree.familyBriefEmptyWeek"),
        birthday: t("tree.eventBirthday"),
        anniversary: t("tree.eventAnniversary"),
        memorial: t("tree.eventMemorial"),
        todayTag: t("tree.eventToday"),
        inDays: t("tree.familyBriefInDays"),
        researchHeader: t("tree.familyBriefResearchHeader"),
        researchFooter: t("tree.familyBriefResearch"),
      },
    });
  };

  const copyFamilyBrief = () => {
    void navigator.clipboard.writeText(buildFamilyBriefText());
    toast.success(t("tree.familyBriefCopied"));
  };

  const shareFamilyBriefWhatsApp = () => {
    openWhatsAppShare(buildFamilyBriefText());
    toast.success(t("tree.whatsAppOpened"));
  };

  const downloadOccasionsCsvFile = () => {
    const all = buildTreeOccasions(occasionsPeople, occasionsRels);
    if (all.length === 0) {
      toast.error(t("tree.occasionsDownloadEmpty"));
      return;
    }
    const kindLabel = (kind: TreeOccasion["kind"]) => {
      if (kind === "birthday") return t("tree.eventBirthday");
      if (kind === "memorial") return t("tree.eventMemorial");
      return t("tree.eventAnniversary");
    };
    downloadOccasionsCsv(
      `nasab-occasions-${occasionsScope}`,
      all,
      kindLabel,
    );
    toast.success(t("tree.occasionsCsvDone", { count: all.length }));
  };

  const sharePersonGapsWhatsApp = (person: Person) => {
    const gaps = findPersonGaps(person, people, rels);
    const text = formatPersonGapsDigest({
      personName: person.givenName,
      gaps,
      gapLabel: (kind) => t(`detail.gap.${kind}`),
      url: absoluteUrl(
        buildTreePersonPath(treeId, person.id, { tab: "chart" }),
      ),
      labels: {
        title: t("detail.gapsDigestTitle"),
        linkHeader: t("tree.pathTextLink"),
        empty: t("detail.gapsEmpty"),
      },
    });
    openWhatsAppShare(text);
    toast.success(t("tree.whatsAppOpened"));
  };

  const familyBriefPrintData = useMemo(() => {
    const all = buildTreeOccasions(occasionsPeople, occasionsRels);
    const today = all.filter((e) => e.daysUntil === 0);
    const week = all.filter((e) => e.daysUntil > 0 && e.daysUntil <= 7);
    const gaps = buildPersonGapsMap(people, rels, { skipNoPhoto: true });
    const researchItems = buildResearchTourItems(
      gaps,
      peopleById,
      dismissedDiscoveryKeys,
      {
        homeId: homePersonId,
        favoriteIds,
        recentIds,
        allowedPersonIds: researchTourAllowedIds,
      },
    );
    const top = researchItems.slice(0, 5);
    const urlFor = (ev: TreeOccasion) =>
      ev.person
        ? absoluteUrl(
            buildTreePersonPath(treeId, ev.person.id, { tab: "chart" }),
          )
        : null;
    return {
      today: today.map((occasion) => ({
        occasion,
        url: urlFor(occasion),
      })),
      week: week.map((occasion) => ({
        occasion,
        url: urlFor(occasion),
      })),
      researchItems: top.map((item) => ({
        name: item.personName,
        gapLabel: t(`detail.gap.${item.kind}`),
        url: absoluteUrl(
          buildTreePersonPath(treeId, item.personId, { tab: "chart" }),
        ),
      })),
      researchCount: researchItems.length,
    };
  }, [
    occasionsPeople,
    occasionsRels,
    people,
    rels,
    peopleById,
    dismissedDiscoveryKeys,
    homePersonId,
    favoriteIds,
    recentIds,
    researchTourAllowedIds,
    treeId,
    t,
  ]);

  const filtered = useMemo(() => {
    const q = search.trim();
    return people.filter((p) => {
      if (listGender !== "all" && p.gender !== listGender) return false;
      if (listLiving === "living" && !p.isLiving) return false;
      if (listLiving === "deceased" && p.isLiving) return false;
      if (listUnlinkedOnly && !unlinkedIds.has(p.id)) return false;
      if (!q) return true;
      return [p.givenName, p.fatherName, p.kunya, p.laqab, p.clan]
        .filter(Boolean)
        .some((f) => f!.includes(q));
    });
  }, [people, search, listGender, listLiving, listUnlinkedOnly, unlinkedIds]);

  const completeness = useMemo(
    () => computeTreeCompleteness(people, rels),
    [people, rels],
  );

  const researchGapsById = useMemo(
    () => buildPersonGapsMap(people, rels, { skipNoPhoto: true }),
    [people, rels],
  );

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
              {canWrite && treeStatus === "active" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  title={t("gedcomImport.title")}
                  onClick={() => setGedcomImportOpen(true)}
                >
                  <FileDown className="h-4 w-4" />
                  <span className="hidden lg:inline">{t("gedcomImport.short")}</span>
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="gap-2"
                title={t("shortcuts.title")}
                onClick={() => setShortcutsOpen(true)}
              >
                <Keyboard className="h-4 w-4" />
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
          completenessScore={completeness.score}
          completeness={completeness}
          completenessOpen={completenessOpen}
          onCompletenessClick={() => setCompletenessOpen((v) => !v)}
        />

        <TreeGrowthChecklist
          people={people}
          rels={rels}
          focusPerson={
            (homePersonId != null ? peopleById.get(homePersonId) : null) ??
            detailPerson ??
            people[0] ??
            null
          }
          canWrite={canWrite}
          completenessScore={completeness.score}
          onAddRelative={(personId, kinship) =>
            openAddRelative(personId, kinship)
          }
          onEditPerson={(p) => {
            setEditPerson(p);
            setDetailPerson(null);
          }}
          onAddFirst={() => {
            setAddAnchorId(null);
            setAddKinship(null);
            setAddOpen(true);
          }}
        />

        <FavoritesStrip
          people={people}
          favoriteIds={favoriteIds}
          onSelect={(p) => revealOnChart(p)}
        />

        <FavoriteRelatesStrip
          people={people}
          rels={rels}
          pairs={favoriteRelatePairs}
          onOpenCompare={(a, b) => {
            setHowRelatedPair({ from: a, to: b });
            setHowRelatedOpen(true);
          }}
          onShowPath={(ids) => {
            setHighlightPathIds(ids);
            setChartView("family");
            setMainTab("chart");
            if (ids.length >= 2) setUrlRelateId(ids[ids.length - 1]!);
            if (ids[0] != null) requestCenterOn(ids[0]);
            toast.success(t("tree.pathHighlightActive", { count: ids.length }));
          }}
          onPrintCert={(a, b) => {
            setKinshipCertPair({ from: a, to: b });
            setKinshipCertOpen(true);
          }}
        />

        <RecentRelatesStrip
          people={people}
          rels={rels}
          pairs={recentRelatePairs}
          onOpenCompare={(a, b) => {
            setHowRelatedPair({ from: a, to: b });
            setHowRelatedOpen(true);
          }}
          onShowPath={(ids) => {
            setHighlightPathIds(ids);
            setChartView("family");
            setMainTab("chart");
            if (ids.length >= 2) setUrlRelateId(ids[ids.length - 1]!);
            if (ids[0] != null) requestCenterOn(ids[0]);
            toast.success(t("tree.pathHighlightActive", { count: ids.length }));
          }}
          onPrintCert={(a, b) => {
            setKinshipCertPair({ from: a, to: b });
            setKinshipCertOpen(true);
          }}
          onPin={(a, b) => {
            const next = toggleFavoriteRelate(treeId, a, b);
            setFavoriteRelatePairs(next);
            const pinned = next.some(
              (p) =>
                (p.a === a && p.b === b) || (p.a === b && p.b === a),
            );
            toast.success(
              pinned
                ? t("tree.favoriteRelateAdded")
                : t("tree.favoriteRelateRemoved"),
            );
          }}
        />

        <RecentPeopleStrip
          people={people}
          recentIds={recentIds}
          onSelect={(p) => revealOnChart(p)}
        />

        <OccasionsScopeChips
          className="mb-2"
          value={occasionsScope}
          onChange={(scope) => {
            setOccasionsScope(treeId, scope);
            setOccasionsScopeState(scope);
          }}
        />

        <TodayEventsBanner
          treeId={treeId}
          people={occasionsPeople}
          rels={occasionsRels}
          onPersonClick={(p) => revealOnChart(p)}
          onAddToCalendar={shareOccasionCalendar}
          onCopyGreeting={shareOccasionGreeting}
          onWhatsAppGreeting={shareOccasionWhatsApp}
        />

        <EventsStrip
          people={occasionsPeople}
          rels={occasionsRels}
          onPersonClick={(p) => revealOnChart(p)}
          onSeeAll={() => setMainTab("occasions")}
          onPrintOccasion={(ev) => setPrintOccasion(ev)}
          onCopyPersonLink={(p) => {
            const url = absoluteUrl(
              buildTreePersonPath(treeId, p.id, { tab: "chart" }),
            );
            void navigator.clipboard.writeText(url);
            toast.success(t("detail.linkCopied"));
          }}
          onAddToCalendar={shareOccasionCalendar}
          onCopyGreeting={shareOccasionGreeting}
          onWhatsAppGreeting={shareOccasionWhatsApp}
          onDownloadUpcomingCalendar={downloadUpcomingOccasionsCalendar}
          onDownloadOccasionsCsv={downloadOccasionsCsvFile}
          onCopyFamilyBrief={copyFamilyBrief}
          onWhatsAppFamilyBrief={shareFamilyBriefWhatsApp}
          onPrintFamilyBrief={() => setFamilyBriefPrintOpen(true)}
        />

        <DiscoveriesPanel
          people={people}
          rels={rels}
          canWrite={canWrite}
          homePersonId={homePersonId}
          favoriteIds={favoriteIds}
          recentIds={recentIds}
          dismissedKeys={dismissedDiscoveryKeys}
          onDismiss={(key) => {
            setDismissedDiscoveryKeys(dismissDiscoveryKey(treeId, key));
          }}
          onClearDismissed={() => {
            setDismissedDiscoveryKeys(clearDismissedDiscoveries(treeId));
          }}
          onOpenPerson={(id) => {
            const p = peopleById.get(id);
            if (p) revealOnChart(p);
          }}
          onAddParent={(personId, role) => openAddRelative(personId, role)}
          onComparePair={(aId, bId) => {
            setHowRelatedPair({ from: aId, to: bId });
            setHowRelatedOpen(true);
          }}
          onHighlightPair={(aId, bId) => {
            const path = findRelationPath(aId, bId, people, rels);
            if (!path) {
              toast.message(t("tree.howRelatedNone"));
              return;
            }
            setHighlightPathIds(path.map((h) => h.personId));
            setChartView("family");
            setChartFocusId(null);
            setMainTab("chart");
            requestCenterOn(aId);
            toast.success(
              t("tree.pathHighlightActive", { count: path.length }),
            );
          }}
          onLinkTwin={(personId, twinOfPersonId) => {
            linkTwinMut.mutate({ treeId, personId, twinOfPersonId });
          }}
        />

        <Tabs value={mainTab} onValueChange={setMainTab} className="min-w-0">
          <TabsList className="mb-4 w-full sm:w-auto h-auto flex flex-wrap justify-start gap-1 p-1">
            <TabsTrigger value="chart" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <LayoutGrid className="h-4 w-4" /> {t("tree.chart")}
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <List className="h-4 w-4" /> {t("tree.list")}
            </TabsTrigger>
            <TabsTrigger value="places" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <MapPin className="h-4 w-4" /> {t("tree.places")}
            </TabsTrigger>
            <TabsTrigger value="occasions" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <Gift className="h-4 w-4" /> {t("tree.occasions")}
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <ImageIcon className="h-4 w-4" /> {t("tree.photos")}
            </TabsTrigger>
            <TabsTrigger value="log" className="gap-1.5 flex-1 sm:flex-none text-xs sm:text-sm">
              <History className="h-4 w-4" /> {t("tree.log")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="min-w-0">
            {(chartFocusPerson || focusTrail.length > 0) && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                <Focus className="h-4 w-4 shrink-0 text-primary" />
                {chartFocusPerson ? (
                  <span className="flex-1 min-w-0">
                    {t("tree.chartFocusedOn", { name: chartFocusPerson.givenName })}
                  </span>
                ) : (
                  <span className="flex-1 min-w-0 text-muted-foreground">
                    {t("tree.focusTrail")}
                  </span>
                )}
                {focusTrail.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={goBackFocus}>
                      {t("tree.focusBack")}
                    </Button>
                    {focusTrail.slice(0, 4).map((id) => {
                      const p = peopleById.get(id);
                      if (!p) return null;
                      return (
                        <Button
                          key={id}
                          size="sm"
                          variant="outline"
                          className="h-7 max-w-[7rem] truncate px-2 text-xs"
                          onClick={() => {
                            setChartFocusId((cur) => {
                              if (cur != null && cur !== id) {
                                setFocusTrail((trail) =>
                                  [
                                    cur,
                                    ...trail.filter((x) => x !== cur && x !== id),
                                  ].slice(0, 8),
                                );
                              }
                              return id;
                            });
                            setFocusTrail((trail) => trail.filter((x) => x !== id));
                            requestCenterOn(id);
                          }}
                          title={p.givenName}
                        >
                          {p.givenName}
                        </Button>
                      );
                    })}
                  </div>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setChartFocusId(null);
                    setFocusTrail([]);
                  }}
                >
                  {t("tree.viewFullTree")}
                </Button>
              </div>
            )}
            {highlightPathIds && highlightPathIds.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm">
                <GitCompareArrows className="h-4 w-4 shrink-0 text-violet-700" />
                <span className="flex-1 min-w-0 text-violet-950">
                  {t("tree.pathHighlightActive", { count: highlightPathIds.length })}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHighlightPathIds(null);
                    setUrlRelateId(null);
                  }}
                >
                  {t("tree.clearPathHighlight")}
                </Button>
              </div>
            )}

            <ResearchTourStrip
              treeId={treeId}
              gapsById={researchGapsById}
              peopleById={peopleById}
              dismissedKeys={dismissedDiscoveryKeys}
              homePersonId={homePersonId}
              favoriteIds={favoriteIds}
              recentIds={recentIds}
              allowedPersonIds={researchTourAllowedIds}
              scope={researchTourScope}
              onScopeChange={(s) => {
                setResearchTourScope(s);
                setResearchTourState(treeId, {
                  scope: s,
                  index: getResearchTourState(treeId).index,
                });
              }}
              canWrite={canWrite}
              onFix={fixResearchGap}
              onShow={(p) => revealOnChart(p)}
              onSkip={(key) => {
                setDismissedDiscoveryKeys(dismissDiscoveryKey(treeId, key));
              }}
            />

            <ConsistencyTourStrip
              treeId={treeId}
              people={people}
              rels={rels}
              dismissedKeys={dismissedDiscoveryKeys}
              homePersonId={homePersonId}
              favoriteIds={favoriteIds}
              recentIds={recentIds}
              allowedPersonIds={consistencyTourAllowedIds}
              scope={consistencyTourScope}
              onScopeChange={(s) => {
                setConsistencyTourScope(s);
                setConsistencyTourState(treeId, {
                  scope: s,
                  index: getConsistencyTourState(treeId).index,
                });
              }}
              onShow={(p) => revealOnChart(p)}
              onCompare={(a, b) => {
                setHowRelatedPair({ from: a, to: b });
                setHowRelatedOpen(true);
              }}
              onSkip={(key) => {
                setDismissedDiscoveryKeys(dismissDiscoveryKey(treeId, key));
              }}
            />

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border bg-card p-0.5 shadow-sm">
                  {(
                    [
                      { id: "family" as const, icon: Network, label: t("chart.viewFamily") },
                      { id: "close" as const, icon: Home, label: t("chart.viewClose") },
                      { id: "pedigree" as const, icon: GitBranch, label: t("chart.viewPedigree") },
                      {
                        id: "descendants" as const,
                        icon: ArrowDownToLine,
                        label: t("chart.viewDescendants"),
                      },
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
                  rels={chartRels}
                  favoriteIds={favoriteIds}
                  recentIds={recentIds}
                  homePersonId={homePersonId}
                  kinshipFocusId={kinshipFocusForViews}
                  onSelect={(p) => {
                    setDetailPerson(p);
                    setChartFocusId((prev) => {
                      if (prev != null && prev !== p.id) {
                        setFocusTrail((trail) =>
                          [
                            prev,
                            ...trail.filter((id) => id !== prev && id !== p.id),
                          ].slice(0, 8),
                        );
                      }
                      return p.id;
                    });
                    requestCenterOn(p.id);
                  }}
                />
                {chartView === "family" || chartView === "descendants" || chartView === "pedigree" || chartView === "fan" ? (
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
                ) : null}
                {(chartView === "family" || chartView === "close") && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    title={
                      chartCompact
                        ? t("chart.densityComfortable")
                        : t("chart.densityCompact")
                    }
                    onClick={() => setChartCompact((v) => !v)}
                  >
                    {chartCompact ? (
                      <Rows2 className="h-4 w-4" />
                    ) : (
                      <Rows3 className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  title={t("tree.howRelatedTitle")}
                  onClick={() => {
                    setHowRelatedPair({
                      from: detailPerson?.id ?? chartFocusId ?? homePersonId,
                      to: null,
                    });
                    setHowRelatedOpen(true);
                  }}
                >
                  <GitCompareArrows className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  title={t("tree.goHomePerson")}
                  onClick={() => {
                    const hid = homePersonId ?? getHomePersonId(treeId);
                    if (hid == null || !peopleById.has(hid)) {
                      toast.message(t("tree.noHomePerson"));
                      return;
                    }
                    const p = peopleById.get(hid)!;
                    setDetailPerson(p);
                    setChartFocusId((prev) => {
                      if (prev != null && prev !== hid) {
                        setFocusTrail((trail) =>
                          [
                            prev,
                            ...trail.filter((id) => id !== prev && id !== hid),
                          ].slice(0, 8),
                        );
                      }
                      return hid;
                    });
                    setHomePersonIdState(hid);
                    requestCenterOn(hid);
                  }}
                >
                  <House className="h-4 w-4" />
                </Button>
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
                    key={`${chartRevision}-${chartView}-${closeFocusId ?? "all"}-${maxGenerations}-${chartCompact ? "c" : "n"}`}
                    people={familyViewData.people}
                    rels={familyViewData.rels}
                    branches={branches}
                    remotePeople={remotePeople}
                    compact={chartCompact}
                    focusMode={chartFocusId != null || chartView === "close"}
                    selectedPersonId={detailPerson?.id ?? null}
                    centerRequest={centerRequest}
                    highlightPathIds={highlightPathIds}
                    kinshipFocusId={
                      chartFocusId ?? homePersonId ?? detailPerson?.id ?? null
                    }
                    onFocusPerson={(p) => {
                      focusOnPerson(p.id);
                      setDetailPerson(p);
                    }}
                    onHowRelated={(p) => {
                      setHowRelatedPair({
                        from:
                          chartFocusId ??
                          homePersonId ??
                          detailPerson?.id ??
                          null,
                        to: p.id,
                      });
                      setHowRelatedOpen(true);
                    }}
                    onEditSpouse={
                      canWrite
                        ? (rel, a, b) => setSpouseEdit({ rel, a, b })
                        : undefined
                    }
                    onPersonClick={(p) => setDetailPerson(p)}
                    gapsById={researchGapsById}
                    canWriteGaps={canWrite}
                    onFixGap={canWrite ? fixResearchGap : undefined}
                    onOpenSideTree={(p) => void openPersonTree(p.id)}
                    onQuickAdd={
                      canWrite
                        ? (p, kinship) => openAddRelative(p.id, kinship)
                        : undefined
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
                        generations={Math.min(maxGenerations, 8)}
                        selectedPersonId={detailPerson?.id ?? null}
                        kinshipFocusId={kinshipFocusForViews}
                        gapsById={researchGapsById}
                        onPersonClick={(p) => {
                          setDetailPerson(p);
                          setChartFocusId(p.id);
                        }}
                        onFocusPerson={(p) => {
                          focusOnPerson(p.id);
                          setDetailPerson(p);
                        }}
                        onHowRelated={openHowRelatedFrom}
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
                        generations={Math.min(maxGenerations, 7)}
                        selectedPersonId={detailPerson?.id ?? null}
                        kinshipFocusId={kinshipFocusForViews}
                        onPersonClick={(p) => {
                          setDetailPerson(p);
                          setChartFocusId(p.id);
                        }}
                        onFocusPerson={(p) => {
                          focusOnPerson(p.id);
                          setDetailPerson(p);
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
                {chartView === "descendants" && (
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
                      <DescendantsView
                        people={chartPeople}
                        rels={chartRels}
                        focusId={focusId}
                        generations={Math.min(maxGenerations, 6)}
                        selectedPersonId={detailPerson?.id ?? null}
                        kinshipFocusId={kinshipFocusForViews}
                        gapsById={researchGapsById}
                        onPersonClick={(p) => {
                          setDetailPerson(p);
                          setChartFocusId(p.id);
                        }}
                        onFocusPerson={(p) => {
                          focusOnPerson(p.id);
                          setDetailPerson(p);
                        }}
                        onHowRelated={openHowRelatedFrom}
                        onAddChild={
                          canWrite
                            ? (parentId) => openAddRelative(parentId, "son")
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
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="relative max-w-sm flex-1">
                    <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("tree.searchPh")}
                      className="pe-9"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-xs"
                      value={listGender}
                      onChange={(e) =>
                        setListGender(e.target.value as "all" | "male" | "female")
                      }
                      aria-label={t("tree.filterGender")}
                    >
                      <option value="all">{t("tree.filterAllGenders")}</option>
                      <option value="male">{t("common.male")}</option>
                      <option value="female">{t("common.female")}</option>
                    </select>
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-xs"
                      value={listLiving}
                      onChange={(e) =>
                        setListLiving(
                          e.target.value as "all" | "living" | "deceased",
                        )
                      }
                      aria-label={t("tree.filterLiving")}
                    >
                      <option value="all">{t("tree.filterAllLiving")}</option>
                      <option value="living">{t("detail.alive")}</option>
                      <option value="deceased">{t("detail.dead")}</option>
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant={listUnlinkedOnly ? "secondary" : "outline"}
                      className="h-9 text-xs"
                      onClick={() => setListUnlinkedOnly((v) => !v)}
                    >
                      {t("tree.filterUnlinked")}
                      {unlinkedIds.size > 0 ? ` (${unlinkedIds.size})` : ""}
                    </Button>
                    <span className="text-xs text-muted-foreground ps-1">
                      {t("tree.filterShowing", { count: filtered.length })}
                    </span>
                  </div>
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
                        <TableHead>{t("tree.cols.actions")}</TableHead>
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
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title={t("detail.showOnChart")}
                                  onClick={() => revealOnChart(p)}
                                >
                                  <Network className="h-4 w-4" />
                                </Button>
                                {canWrite && (
                                  <>
                                    <Button size="icon" variant="ghost" title={t("common.edit")} onClick={() => setEditPerson(p)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" title={t("common.link")} onClick={() => setLinkAnchor(p)}>
                                      <Link2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" title={t("common.delete")} className="text-destructive" onClick={() => setDeletePerson(p)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="places">
            <PlacesBrowser
              people={people}
              rels={rels}
              kinshipFocusId={listFocusId}
              onPersonClick={(p) => revealOnChart(p)}
              onPrintMap={() => navigate(buildPrintTemplatePath(treeId, "map"))}
            />
          </TabsContent>

          <TabsContent value="occasions">
            <div className="mb-3">
              <OccasionsScopeChips
                value={occasionsScope}
                onChange={(scope) => {
                  setOccasionsScope(treeId, scope);
                  setOccasionsScopeState(scope);
                }}
              />
            </div>
            <OccasionsPanel
              people={occasionsPeople}
              rels={occasionsRels}
              onPersonClick={(p) => revealOnChart(p)}
              onPrintOccasion={(ev) => setPrintOccasion(ev)}
              onAddToCalendar={shareOccasionCalendar}
              onCopyGreeting={shareOccasionGreeting}
              onWhatsAppGreeting={shareOccasionWhatsApp}
              onDownloadUpcomingCalendar={downloadUpcomingOccasionsCalendar}
            />
          </TabsContent>

          <TabsContent value="photos">
            <PhotosGallery
              people={people}
              rels={rels}
              homePersonId={homePersonId}
              favoriteIds={favoriteIds}
              recentIds={recentIds}
              kinshipFocusId={listFocusId}
              onPersonClick={(p) => revealOnChart(p)}
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
            setAddTwinOfId(null);
          }
        }}
        people={people}
        rels={rels}
        defaultAnchorId={addAnchorId}
        defaultKinship={addKinship}
        defaultTwinOfId={addTwinOfId}
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
      <GedcomImportDialog
        treeId={treeId}
        open={gedcomImportOpen}
        onOpenChange={setGedcomImportOpen}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <SpouseDatesDialog
        treeId={treeId}
        open={!!spouseEdit}
        onOpenChange={(o) => !o && setSpouseEdit(null)}
        relationship={spouseEdit?.rel ?? null}
        personA={spouseEdit?.a}
        personB={spouseEdit?.b}
      />
      <RelationPathDialog
        open={howRelatedOpen}
        onOpenChange={(o) => {
          setHowRelatedOpen(o);
          if (!o) setHowRelatedPair({ from: null, to: null });
        }}
        people={people}
        rels={rels}
        defaultFromId={
          howRelatedPair.from ??
          detailPerson?.id ??
          chartFocusId ??
          homePersonId
        }
        defaultToId={howRelatedPair.to}
        onOpenPerson={(p) => {
          setDetailPerson(p);
          setChartFocusId(p.id);
          setHowRelatedOpen(false);
          requestCenterOn(p.id);
        }}
        onShowOnChart={(ids) => {
          setHighlightPathIds(ids);
          setChartView("family");
          setChartFocusId(null);
          setMainTab("chart");
          if (ids.length >= 2) {
            setUrlRelateId(ids[ids.length - 1]!);
            rememberRelate(ids[0]!, ids[ids.length - 1]!);
          }
          if (ids[0] != null) requestCenterOn(ids[0]);
          toast.success(t("tree.pathHighlightActive", { count: ids.length }));
        }}
        onCopyPathLink={copyPathLink}
        onCopyPathText={copyPathText}
        onWhatsAppPath={sharePathWhatsApp}
        recentPairs={recentRelatePairs}
        favoritePairs={favoriteRelatePairs}
        homePersonId={homePersonId}
        onCopyPersonCard={copyPersonCard}
        onCopyBothCards={(a, b) => {
          const pa = peopleById.get(a);
          const pb = peopleById.get(b);
          if (!pa || !pb) return;
          const cardA = (() => {
            const url = absoluteUrl(
              buildTreePersonPath(treeId, pa.id, { tab: "chart" }),
            );
            return formatPersonShareCard({
              person: pa,
              url,
              labels: {
                kinship: t("tree.personCardKinship"),
                pathHeader: t("tree.pathTextHops"),
                linkHeader: t("tree.pathTextLink"),
              },
            });
          })();
          const cardB = (() => {
            const url = absoluteUrl(
              buildTreePersonPath(treeId, pb.id, { tab: "chart" }),
            );
            return formatPersonShareCard({
              person: pb,
              url,
              labels: {
                kinship: t("tree.personCardKinship"),
                pathHeader: t("tree.pathTextHops"),
                linkHeader: t("tree.pathTextLink"),
              },
            });
          })();
          void navigator.clipboard.writeText(`${cardA}\n\n——\n\n${cardB}`);
          rememberRelate(a, b);
          toast.success(t("tree.bothCardsCopied"));
        }}
        onToggleFavoritePair={(a, b) => {
          const next = toggleFavoriteRelate(treeId, a, b);
          setFavoriteRelatePairs(next);
          const pinned = next.some((p) => {
            const lo = Math.min(a, b);
            const hi = Math.max(a, b);
            return p.a === lo && p.b === hi;
          });
          toast.success(
            pinned ? t("tree.favoriteRelateAdded") : t("tree.favoriteRelateRemoved"),
          );
        }}
        onPrintCertificate={(a, b) => {
          rememberRelate(a, b);
          setKinshipCertPair({ from: a, to: b });
          setKinshipCertOpen(true);
        }}
        onSelectRecentPair={(a, b) => {
          rememberRelate(a, b);
          setHowRelatedPair({ from: a, to: b });
        }}
      />

      <KinshipCertificateDialog
        open={kinshipCertOpen}
        onOpenChange={setKinshipCertOpen}
        fromId={kinshipCertPair.from}
        toId={kinshipCertPair.to}
        people={people}
        rels={rels}
        treeName={tree.name}
        pathUrl={
          kinshipCertPair.from != null && kinshipCertPair.to != null
            ? absoluteUrl(
                buildTreePersonPath(treeId, kinshipCertPair.from, {
                  relate: kinshipCertPair.to,
                  tab: "chart",
                }),
              )
            : ""
        }
      />

      <OccasionCardPrintDialog
        open={!!printOccasion}
        onOpenChange={(o) => !o && setPrintOccasion(null)}
        occasion={printOccasion}
        people={people}
        rels={rels}
        homePersonId={homePersonId}
        treeName={tree.name}
        personUrl={
          printOccasion?.person
            ? absoluteUrl(
                buildTreePersonPath(treeId, printOccasion.person.id, {
                  tab: "chart",
                }),
              )
            : ""
        }
      />

      <FamilyBriefPrintDialog
        open={familyBriefPrintOpen}
        onOpenChange={setFamilyBriefPrintOpen}
        today={familyBriefPrintData.today}
        week={familyBriefPrintData.week}
        researchItems={familyBriefPrintData.researchItems}
        researchCount={familyBriefPrintData.researchCount}
        treeName={tree.name}
      />

      <PersonShareQrDialog
        open={!!qrPerson}
        onOpenChange={(o) => !o && setQrPerson(null)}
        url={
          qrPerson
            ? absoluteUrl(
                buildTreePersonPath(treeId, qrPerson.id, { tab: "chart" }),
              )
            : ""
        }
        personName={qrPerson?.givenName}
      />

      <PersonProfilePrintDialog
        open={!!profilePrintPerson}
        onOpenChange={(o) => !o && setProfilePrintPerson(null)}
        person={profilePrintPerson}
        people={people}
        rels={rels}
        homePersonId={homePersonId}
        treeName={tree.name}
        personUrl={
          profilePrintPerson
            ? absoluteUrl(
                buildTreePersonPath(treeId, profilePrintPerson.id, {
                  tab: "chart",
                }),
              )
            : ""
        }
      />

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
            const siblingIds = new Set<number>();
            for (const pid of [fatherId, motherId]) {
              if (pid == null) continue;
              for (const sid of childrenOf.get(pid) ?? []) {
                if (sid !== detailPerson.id) siblingIds.add(sid);
              }
            }
            const siblings = [...siblingIds]
              .map((id) => peopleById.get(id))
              .filter((p): p is Person => !!p);
            const immediateMembers = [
              ...(father ? [{ person: father, role: "father" as const }] : []),
              ...(mother ? [{ person: mother, role: "mother" as const }] : []),
              ...spouses.map((p) => ({ person: p, role: "spouse" as const })),
              ...siblings.map((p) => ({ person: p, role: "sibling" as const })),
              ...children.map((p) => ({ person: p, role: "child" as const })),
            ];
            const hasLinks = !!(father || mother || spouses.length || children.length);
            const timeline: Array<{
              year: number | null;
              label: string;
              key: string;
              personId?: number;
            }> = [];
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
                personId: sp.id,
              });
            }
            for (const ch of children) {
              timeline.push({
                year: ch.birthYear ?? null,
                label: t("tree.timelineChild", { name: ch.givenName }),
                key: `c-${ch.id}`,
                personId: ch.id,
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
            const fullSiblings = (() => {
              const set = new Map<number, Person>();
              set.set(detailPerson.id, detailPerson);
              for (const s of siblings) set.set(s.id, s);
              return [...set.values()].sort((a, b) =>
                a.givenName.localeCompare(b.givenName, "ar"),
              );
            })();
            const curSibIdx = fullSiblings.findIndex((s) => s.id === detailPerson.id);
            const prevSib =
              fullSiblings.length > 1 && curSibIdx >= 0
                ? fullSiblings[
                    (curSibIdx - 1 + fullSiblings.length) % fullSiblings.length
                  ]
                : null;
            const nextSib =
              fullSiblings.length > 1 && curSibIdx >= 0
                ? fullSiblings[(curSibIdx + 1) % fullSiblings.length]
                : null;
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
                    <div className="mb-1 flex items-center gap-1">
                      {prevSib && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title={t("detail.prevSibling", { name: prevSib.givenName })}
                          onClick={() => {
                            setDetailPerson(prevSib);
                            setChartFocusId(prevSib.id);
                            requestCenterOn(prevSib.id);
                          }}
                        >
                          <ChevronRight className="h-4 w-4 rtl:hidden" />
                          <ChevronLeft className="hidden h-4 w-4 rtl:block" />
                        </Button>
                      )}
                      {nextSib && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          title={t("detail.nextSibling", { name: nextSib.givenName })}
                          onClick={() => {
                            setDetailPerson(nextSib);
                            setChartFocusId(nextSib.id);
                            requestCenterOn(nextSib.id);
                          }}
                        >
                          <ChevronLeft className="h-4 w-4 rtl:hidden" />
                          <ChevronRight className="hidden h-4 w-4 rtl:block" />
                        </Button>
                      )}
                      {fullSiblings.length > 1 && (
                        <span className="text-[10px] text-muted-foreground">
                          {t("detail.siblingOf", {
                            current: curSibIdx + 1,
                            total: fullSiblings.length,
                          })}
                        </span>
                      )}
                    </div>
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
                    {homePersonId != null &&
                      homePersonId !== detailPerson.id &&
                      peopleById.has(homePersonId) &&
                      (() => {
                        const path = findRelationPath(
                          homePersonId,
                          detailPerson.id,
                          people,
                          rels,
                        );
                        const key = classifyRelationPath(
                          homePersonId,
                          detailPerson.id,
                          people,
                          rels,
                          path,
                        );
                        const home = peopleById.get(homePersonId)!;
                        return (
                          <button
                            type="button"
                            className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-start text-[11px] font-medium text-sky-900 transition hover:bg-sky-100"
                            title={t("detail.kinshipHeroHint")}
                            onClick={() => {
                              if (!path) return;
                              setHighlightPathIds(path.map((h) => h.personId));
                              setChartView("family");
                              setMainTab("chart");
                              requestCenterOn(detailPerson.id);
                              toast.success(
                                t("tree.pathHighlightActive", {
                                  count: path.length,
                                }),
                              );
                            }}
                          >
                            <House className="h-3 w-3 shrink-0 text-emerald-700" />
                            <span className="truncate">
                              {t("detail.kinshipHero", {
                                rel: t(`tree.rel.${key}`),
                                home: home.givenName,
                              })}
                            </span>
                            <Eye className="h-3 w-3 shrink-0 opacity-70" />
                          </button>
                        );
                      })()}
                  </div>
                </div>
              </SheetHeader>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => void openPersonTree(detailPerson.id)}
                >
                  <Focus className="h-3.5 w-3.5" />
                  {t("detail.profileAction")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => revealOnChart(detailPerson)}
                >
                  <Network className="h-3.5 w-3.5" />
                  {t("detail.showOnChart")}
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
                  <QuickAddMenu
                    onPick={(kinship) =>
                      openAddRelative(detailPerson.id, kinship)
                    }
                  />
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
                <Button
                  size="sm"
                  variant={homePersonId === detailPerson.id ? "secondary" : "outline"}
                  className="gap-1.5"
                  onClick={() => {
                    setHomePersonId(treeId, detailPerson.id);
                    setHomePersonIdState(detailPerson.id);
                    toast.success(t("tree.homePersonSet"));
                  }}
                >
                  <House className="h-3.5 w-3.5" />
                  {t("tree.setHomePerson")}
                </Button>
                <Button
                  size="sm"
                  variant={favoriteIds.includes(detailPerson.id) ? "secondary" : "outline"}
                  className="gap-1.5"
                  onClick={() => {
                    const next = toggleFavoritePersonId(treeId, detailPerson.id);
                    setFavoriteIds(next);
                    toast.success(
                      next.includes(detailPerson.id)
                        ? t("tree.favoriteAdded")
                        : t("tree.favoriteRemoved"),
                    );
                  }}
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      favoriteIds.includes(detailPerson.id) &&
                        "fill-amber-400 text-amber-500",
                    )}
                  />
                  {favoriteIds.includes(detailPerson.id)
                    ? t("tree.unfavorite")
                    : t("tree.favorite")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    const url = absoluteUrl(
                      buildTreePersonPath(treeId, detailPerson.id, {
                        view: chartView,
                        tab: mainTab,
                      }),
                    );
                    void navigator.clipboard.writeText(url);
                    toast.success(t("detail.linkCopied"));
                  }}
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  {t("detail.copyPersonLink")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => copyPersonCard(detailPerson)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("tree.copyPersonCard")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => sharePersonWhatsApp(detailPerson)}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {t("tree.sharePersonWhatsApp")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setQrPerson(detailPerson)}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  {t("share.showQR")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    downloadPersonVCard(detailPerson, {
                      url: absoluteUrl(
                        buildTreePersonPath(treeId, detailPerson.id, {
                          tab: "chart",
                        }),
                      ),
                      treeName: tree.name,
                    });
                    toast.success(t("detail.vcardDownloaded"));
                  }}
                >
                  <Contact className="h-3.5 w-3.5" />
                  {t("detail.downloadVcard")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    downloadPersonJson(detailPerson, people, rels, {
                      url: absoluteUrl(
                        buildTreePersonPath(treeId, detailPerson.id, {
                          tab: "chart",
                        }),
                      ),
                      treeName: tree.name,
                    });
                    toast.success(t("detail.jsonDownloaded"));
                  }}
                >
                  <FileDown className="h-3.5 w-3.5" />
                  {t("detail.downloadPersonJson")}
                </Button>
                {shareUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      const url = absoluteUrl(
                        buildSharePersonPath(tree.shareToken!, detailPerson.id),
                      );
                      void navigator.clipboard.writeText(url);
                      toast.success(t("detail.sharePersonCopied"));
                    }}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    {t("detail.copySharePersonLink")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() =>
                    navigate(buildPrintRootPath(treeId, detailPerson.id))
                  }
                >
                  <Printer className="h-3.5 w-3.5" />
                  {t("detail.printFromHere")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setProfilePrintPerson(detailPerson)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  {t("tree.printPersonProfile")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => {
                    setHowRelatedPair({
                      from: detailPerson.id,
                      to: null,
                    });
                    setHowRelatedOpen(true);
                  }}
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                  {t("tree.howRelatedTitle")}
                </Button>
              </div>
              {homePersonId != null &&
                homePersonId !== detailPerson.id &&
                peopleById.has(homePersonId) && (
                  <PathToHomeStrip
                    homePerson={peopleById.get(homePersonId)!}
                    detailPerson={detailPerson}
                    people={people}
                    rels={rels}
                    onSelectHop={(p) => {
                      setDetailPerson(p);
                      setChartFocusId(p.id);
                      requestCenterOn(p.id);
                    }}
                    onHighlightPath={(ids) => {
                      setHighlightPathIds(ids);
                      setChartView("family");
                      setMainTab("chart");
                      setUrlRelateId(homePersonId);
                      if (ids[0] != null) requestCenterOn(ids[0]);
                      toast.success(
                        t("tree.pathHighlightActive", { count: ids.length }),
                      );
                    }}
                    onCopyPathLink={() =>
                      copyPathLink(detailPerson.id, homePersonId)
                    }
                    onCopyPathText={() =>
                      copyPathText(homePersonId, detailPerson.id)
                    }
                  />
                )}
              <ImmediateFamilyStrip
                members={immediateMembers}
                people={people}
                rels={rels}
                onSelect={(p) => {
                  setDetailPerson(p);
                  setChartFocusId(p.id);
                  requestCenterOn(p.id);
                }}
              />
              <BirthOrderStrip
                siblings={fullSiblings}
                focusId={detailPerson.id}
                people={people}
                rels={rels}
                onSelect={(p) => {
                  setDetailPerson(p);
                  setChartFocusId(p.id);
                  requestCenterOn(p.id);
                }}
              />
              <TwinFamilyPanel
                treeId={treeId}
                person={detailPerson}
                siblings={fullSiblings}
                people={people}
                rels={rels}
                canWrite={canWrite}
                onAddTwin={() => openAddTwin(detailPerson.id)}
                onSelectTwin={(p) => {
                  setDetailPerson(p);
                  setChartFocusId(p.id);
                  requestCenterOn(p.id);
                }}
                onChanged={refreshChart}
              />
              <PersonGapsStrip
                person={detailPerson}
                people={people}
                rels={rels}
                canWrite={canWrite}
                onEdit={() => {
                  setEditPerson(detailPerson);
                  setDetailPerson(null);
                }}
                onAddParent={(role) =>
                  openAddRelative(detailPerson.id, role)
                }
                onAddSpouse={() =>
                  openAddRelative(detailPerson.id, "spouse")
                }
                onWhatsAppGaps={() => sharePersonGapsWhatsApp(detailPerson)}
                onOpenPerson={(id) => {
                  const p = peopleById.get(id);
                  if (p) {
                    setDetailPerson(p);
                    revealOnChart(p);
                  }
                }}
                onHighlightPair={(aId, bId) => {
                  const path = findRelationPath(aId, bId, people, rels);
                  if (!path) {
                    toast.message(t("tree.howRelatedNone"));
                    return;
                  }
                  setHighlightPathIds(path.map((h) => h.personId));
                  setChartView("family");
                  setChartFocusId(null);
                  setMainTab("chart");
                  requestCenterOn(aId);
                  toast.success(
                    t("tree.pathHighlightActive", { count: path.length }),
                  );
                }}
                onLinkTwin={(personId, twinOfPersonId) => {
                  linkTwinMut.mutate({ treeId, personId, twinOfPersonId });
                }}
              />
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
                        {ev.personId != null ? (
                          <button
                            type="button"
                            className="text-start text-foreground/90 underline-offset-2 hover:underline"
                            onClick={() => {
                              const p = peopleById.get(ev.personId!);
                              if (p) {
                                setDetailPerson(p);
                                setChartFocusId(p.id);
                                requestCenterOn(p.id);
                              }
                            }}
                          >
                            {ev.label}
                          </button>
                        ) : (
                          <span className="text-foreground/90">{ev.label}</span>
                        )}
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
              {(ranks.amongSiblings ||
                ranks.amongGenderInTree ||
                ranks.amongCousins ||
                detailPerson.twinGroupId != null) && (
                <PersonRankLines
                  ranks={ranks}
                  gender={detailPerson.gender}
                  t={t}
                  className="text-xs"
                  person={detailPerson}
                  people={people}
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
