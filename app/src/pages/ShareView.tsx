import { Link, useParams, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import FamilyChart from "@/components/tree/FamilyChart";
import PedigreeView from "@/components/tree/PedigreeView";
import FanChartView from "@/components/tree/FanChartView";
import DescendantsView from "@/components/tree/DescendantsView";
import ImmediateFamilyStrip from "@/components/tree/ImmediateFamilyStrip";
import EventsStrip from "@/components/tree/EventsStrip";
import TodayEventsBanner from "@/components/tree/TodayEventsBanner";
import OccasionsPanel from "@/components/tree/OccasionsPanel";
import OccasionsScopeChips from "@/components/tree/OccasionsScopeChips";
import DiscoveriesPanel from "@/components/tree/DiscoveriesPanel";
import PlacesBrowser from "@/components/tree/PlacesBrowser";
import PersonGapsStrip from "@/components/tree/PersonGapsStrip";
import BirthOrderStrip from "@/components/tree/BirthOrderStrip";
import PersonShareQrDialog from "@/components/tree/PersonShareQrDialog";
import PathToHomeStrip from "@/components/tree/PathToHomeStrip";
import PhotosGallery from "@/components/tree/PhotosGallery";
import TreeGrowthChecklist from "@/components/tree/TreeGrowthChecklist";
import ShareCompletenessCard from "@/components/tree/ShareCompletenessCard";
import KinshipCertificateDialog from "@/components/tree/KinshipCertificateDialog";
import PersonProfilePrintDialog from "@/components/tree/PersonProfilePrintDialog";
import OccasionCardPrintDialog from "@/components/tree/OccasionCardPrintDialog";
import FamilyBriefPrintDialog from "@/components/tree/FamilyBriefPrintDialog";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLabels } from "@/lib/labels";
import { computeTreeCompleteness } from "@/lib/treeCompleteness";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  TreePalm,
  ShieldCheck,
  Lock,
  Copy,
  Link as LinkIcon,
  ChevronLeft,
  Eye,
  Printer,
  MessageCircle,
  Contact,
  FileDown,
  MapPin,
  Image as ImageIcon,
  QrCode,
  Network,
  GitBranch,
  Fan,
  ArrowDownToLine,
} from "lucide-react";
import type { Person } from "@db/schema";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  absoluteUrl,
  buildSharePersonPath,
  parsePersonIdParam,
} from "@/lib/treeUrl";
import {
  classifyRelationPath,
  findCommonAncestorId,
  findRelationPath,
  type PathHop,
} from "@/lib/relationPath";
import {
  formatPersonShareCard,
  formatRelationPathText,
} from "@/lib/relationShare";
import {
  buildOccasionIcs,
  buildMultiOccasionIcs,
  downloadIcs,
  occasionGreetingText,
} from "@/lib/occasionShare";
import { openWhatsAppShare } from "@/lib/whatsAppShare";
import {
  downloadPersonJson,
  downloadPersonVCard,
} from "@/lib/personExport";
import { downloadOccasionsCsv } from "@/lib/occasionsCsv";
import { formatPersonGapsDigest } from "@/lib/researchDigest";
import { findPersonGaps } from "@/lib/personGaps";
import { formatFamilyBrief } from "@/lib/familyBrief";
import { buildTreeOccasions, type TreeOccasion } from "@/lib/treeOccasions";
import {
  getShareOccasionsScope,
  setShareOccasionsScope,
  type OccasionsScope,
} from "@/lib/occasionsScope";
import { collectCloseFamily } from "@/lib/closeFamily";
import { getFavoritePersonIds } from "@/lib/favoritePeople";
import {
  buildChildrenOf,
  buildSpousesOf,
  getParents,
} from "@/lib/familyGraph";
import { toast } from "sonner";
import type { Relationship } from "@db/schema";
import { cn } from "@/lib/utils";

/** عرض عام للقراءة فقط — يحترم كل قواعد الخصوصية */
export default function ShareView() {
  const { token } = useParams<{ token: string }>();
  const shareToken = token ?? "";
  const [searchParams, setSearchParams] = useSearchParams();
  const [detail, setDetail] = useState<Person | null>(null);
  const [relateId, setRelateId] = useState<number | null>(null);
  const [highlightPathIds, setHighlightPathIds] = useState<number[] | null>(
    null,
  );
  const [centerRequest, setCenterRequest] = useState<{
    personId: number;
    token: number;
  } | null>(null);
  const centerTokenRef = useRef(0);
  const bootstrapped = useRef(false);
  const [occasionsScope, setOccasionsScopeState] =
    useState<OccasionsScope>("close");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [certOpen, setCertOpen] = useState(false);
  const [profilePrintOpen, setProfilePrintOpen] = useState(false);
  const [printOccasion, setPrintOccasion] = useState<TreeOccasion | null>(null);
  const [familyBriefPrintOpen, setFamilyBriefPrintOpen] = useState(false);
  const [showOccasionsPanel, setShowOccasionsPanel] = useState(false);
  const [showPlacesPanel, setShowPlacesPanel] = useState(false);
  const [showPhotosPanel, setShowPhotosPanel] = useState(false);
  const [qrPerson, setQrPerson] = useState<Person | null>(null);
  const [chartView, setChartView] = useState<
    "family" | "pedigree" | "fan" | "descendants"
  >("family");
  const { t } = useTranslation();
  const L = useLabels();

  const query = trpc.person.listPublic.useQuery(
    { shareToken },
    { enabled: shareToken.length >= 16, retry: false },
  );

  const people = useMemo(
    () => (query.data?.people ?? []) as Person[],
    [query.data?.people],
  );
  const rels = useMemo(
    () => (query.data?.rels ?? []) as Relationship[],
    [query.data?.rels],
  );
  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );
  const spousesOf = useMemo(() => buildSpousesOf(rels), [rels]);
  const childrenOf = useMemo(() => buildChildrenOf(rels), [rels]);

  useEffect(() => {
    if (shareToken) {
      setOccasionsScopeState(getShareOccasionsScope(shareToken));
    }
  }, [shareToken]);

  useEffect(() => {
    const tid = query.data?.tree?.id;
    if (tid) setFavoriteIds(getFavoritePersonIds(tid));
  }, [query.data?.tree?.id]);

  const { occasionsPeople, occasionsRels } = useMemo(() => {
    if (occasionsScope === "all") {
      return { occasionsPeople: people, occasionsRels: rels };
    }
    if (occasionsScope === "favorites") {
      const ids = new Set(favoriteIds);
      const anchor = detail?.id ?? people[0]?.id;
      if (anchor != null) ids.add(anchor);
      return {
        occasionsPeople: people.filter((p) => ids.has(p.id)),
        occasionsRels: rels.filter(
          (r) => ids.has(r.fromPersonId) && ids.has(r.toPersonId),
        ),
      };
    }
    const focus = detail?.id ?? people[0]?.id ?? null;
    if (focus == null) return { occasionsPeople: people, occasionsRels: rels };
    const close = collectCloseFamily(focus, people, rels);
    return { occasionsPeople: close.people, occasionsRels: close.rels };
  }, [occasionsScope, people, rels, favoriteIds, detail?.id]);
  useEffect(() => {
    if (bootstrapped.current || !query.data || people.length === 0) return;
    bootstrapped.current = true;
    const pid = parsePersonIdParam(searchParams.get("person"));
    const rid = parsePersonIdParam(searchParams.get("relate"));
    if (pid != null && peopleById.has(pid)) {
      const p = peopleById.get(pid)!;
      setDetail(p);
      centerTokenRef.current += 1;
      setCenterRequest({ personId: pid, token: centerTokenRef.current });
    }
    if (
      pid != null &&
      rid != null &&
      pid !== rid &&
      peopleById.has(rid)
    ) {
      setRelateId(rid);
      const path = findRelationPath(pid, rid, people, rels);
      if (path && path.length > 1) {
        setHighlightPathIds(path.map((h) => h.personId));
        const label = classifyRelationPath(pid, rid, people, rels, path);
        toast.success(
          t("tree.pathLinkOpened", {
            rel: t(`tree.rel.${label}`),
            count: path.length,
          }),
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, people.length, peopleById]);

  useEffect(() => {
    if (!bootstrapped.current) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (detail) next.set("person", String(detail.id));
        else next.delete("person");
        if (relateId != null) next.set("relate", String(relateId));
        else next.delete("relate");
        return next.toString() === prev.toString() ? prev : next;
      },
      { replace: true },
    );
  }, [detail?.id, relateId, setSearchParams]);

  const pathInfo = useMemo(() => {
    if (!detail || relateId == null || !peopleById.has(relateId)) return null;
    const hops = findRelationPath(detail.id, relateId, people, rels);
    if (!hops || hops.length < 2) return null;
    const key = classifyRelationPath(
      detail.id,
      relateId,
      people,
      rels,
      hops,
    );
    const mrcaId = findCommonAncestorId(hops);
    return {
      hops,
      label: t(`tree.rel.${key}`),
      relate: peopleById.get(relateId)!,
      mrca: mrcaId != null ? peopleById.get(mrcaId) ?? null : null,
    };
  }, [detail, relateId, people, rels, peopleById, t]);

  const openPerson = (p: Person) => {
    setDetail(p);
    centerTokenRef.current += 1;
    setCenterRequest({ personId: p.id, token: centerTokenRef.current });
  };

  const viaLabel = (via: PathHop["via"]) => {
    if (via === "start") return null;
    if (via === "parent") return t("tree.pathViaParent");
    if (via === "child") return t("tree.pathViaChild");
    return t("tree.pathViaSpouse");
  };

  const copyPathText = () => {
    if (!detail || !pathInfo) return;
    const url = absoluteUrl(
      buildSharePersonPath(shareToken, detail.id, { relate: relateId }),
    );
    const text = formatRelationPathText({
      fromName: detail.givenName,
      toName: pathInfo.relate.givenName,
      relationLabel: pathInfo.label,
      hops: pathInfo.hops,
      peopleById,
      viaLabel: (via) => viaLabel(via) ?? via,
      url,
      commonAncestorName: pathInfo.mrca?.givenName ?? null,
      labels: {
        headline: t("tree.pathTextHeadline"),
        hopsHeader: t("tree.pathTextHops"),
        linkHeader: t("tree.pathTextLink"),
        commonAncestor: t("tree.commonAncestorAt"),
      },
    });
    void navigator.clipboard.writeText(text);
    toast.success(t("tree.pathTextCopied"));
  };

  const sharePathWhatsApp = () => {
    if (!detail || !pathInfo) return;
    const url = absoluteUrl(
      buildSharePersonPath(shareToken, detail.id, { relate: relateId }),
    );
    const text = formatRelationPathText({
      fromName: detail.givenName,
      toName: pathInfo.relate.givenName,
      relationLabel: pathInfo.label,
      hops: pathInfo.hops,
      peopleById,
      viaLabel: (via) => viaLabel(via) ?? via,
      url,
      commonAncestorName: pathInfo.mrca?.givenName ?? null,
      labels: {
        headline: t("tree.pathTextHeadline"),
        hopsHeader: t("tree.pathTextHops"),
        linkHeader: t("tree.pathTextLink"),
        commonAncestor: t("tree.commonAncestorAt"),
      },
    });
    openWhatsAppShare(text);
    toast.success(t("tree.whatsAppOpened"));
  };

  const buildPersonCardText = (person: Person): string => {
    const url = absoluteUrl(buildSharePersonPath(shareToken, person.id));
    let relationLabel: string | null = null;
    let homeName: string | null = null;
    let hopNames: string[] | undefined;
    if (relateId != null && relateId !== person.id && peopleById.has(relateId)) {
      const other = peopleById.get(relateId)!;
      homeName = other.givenName;
      const hops = findRelationPath(relateId, person.id, people, rels);
      const key = classifyRelationPath(relateId, person.id, people, rels, hops);
      relationLabel = t(`tree.rel.${key}`);
      if (hops && hops.length > 1) {
        hopNames = hops
          .map((h) => peopleById.get(h.personId)?.givenName)
          .filter((n): n is string => !!n);
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
      buildSharePersonPath(shareToken, ev.person.id),
    );
    downloadIcs(
      `nasab-${ev.key}`,
      buildOccasionIcs(ev, {
        title: occasionIcsTitle(ev),
        description: t("tree.icsDescription", { url: personUrl }),
        url: personUrl,
      }),
    );
    toast.success(t("tree.icsDownloaded"));
  };

  const buildGreetingForOccasion = (ev: TreeOccasion): string | null => {
    if (!ev.person) return null;
    const personUrl = absoluteUrl(
      buildSharePersonPath(shareToken, ev.person.id),
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
    const upcoming = buildTreeOccasions(occasionsPeople, occasionsRels).filter(
      (e) => e.daysUntil <= 90,
    );
    if (upcoming.length === 0) {
      toast.error(t("tree.occasionsDownloadEmpty"));
      return;
    }
    const items = upcoming.map((ev) => {
      const personUrl = ev.person
        ? absoluteUrl(buildSharePersonPath(shareToken, ev.person.id))
        : undefined;
      return {
        ev,
        title: occasionIcsTitle(ev),
        description: t("tree.icsDescription", { url: personUrl ?? "" }),
        url: personUrl,
      };
    });
    downloadIcs(`nasab-share-occasions-90d`, buildMultiOccasionIcs(items));
    toast.success(t("tree.occasionsDownloadDone", { count: upcoming.length }));
  };

  const buildFamilyBriefText = () => {
    const all = buildTreeOccasions(occasionsPeople, occasionsRels);
    const today = all.filter((e) => e.daysUntil === 0);
    const week = all.filter((e) => e.daysUntil > 0 && e.daysUntil <= 7);
    return formatFamilyBrief({
      today,
      week,
      researchCount: 0,
      urlFor: (ev) =>
        ev.person
          ? absoluteUrl(buildSharePersonPath(shareToken, ev.person.id))
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
    downloadOccasionsCsv(`nasab-share-occasions`, all, kindLabel);
    toast.success(t("tree.occasionsCsvDone", { count: all.length }));
  };

  const sharePersonGapsWhatsApp = (person: Person) => {
    const gaps = findPersonGaps(person, people, rels);
    const text = formatPersonGapsDigest({
      personName: person.givenName,
      gaps,
      gapLabel: (kind) => t(`detail.gap.${kind}`),
      url: absoluteUrl(buildSharePersonPath(shareToken, person.id)),
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
    const urlFor = (ev: TreeOccasion) =>
      ev.person
        ? absoluteUrl(buildSharePersonPath(shareToken, ev.person.id))
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
    };
  }, [occasionsPeople, occasionsRels, shareToken]);

  const completeness = useMemo(
    () => computeTreeCompleteness(people, rels),
    [people, rels],
  );

  const chartFocusId =
    detail?.id ?? relateId ?? people[0]?.id ?? null;

  if (query.isLoading) {
    return (
      <div className="min-h-screen p-10 space-y-4">
        <Skeleton className="h-12 w-72 mx-auto" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <Lock className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h1 className="font-display text-2xl font-bold">{t("share.privateTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("share.privateBody")}</p>
        <Button className="mt-6" asChild>
          <Link to="/">{t("share.home")}</Link>
        </Button>
      </div>
    );
  }

  const { tree } = query.data;
  const isMember = !!tree.myRole;
  const treeId = tree.id;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TreePalm className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-bold text-primary">{t("brand")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {isMember ? (
              <Button asChild>
                <Link to={`/trees/${treeId}`}>{t("share.openWorkspace")}</Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/login">{t("share.createYours")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold">{t("share.treeOf", { name: tree.name })}</h1>
          <p className="mt-1 text-muted-foreground">
            {[tree.tribe, tree.region].filter(Boolean).join(" — ")}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3 text-primary" />
              {t("share.publicBadge")}
            </Badge>
            <Badge variant="secondary">{t("share.visibleCount", { count: people.length })}</Badge>
          </div>
        </div>

        {pathInfo && detail && (
          <div className="mb-4 rounded-xl border border-sky-200/80 bg-sky-50/60 px-3 py-2.5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-sky-950">
                {t("share.pathBanner", {
                  from: detail.givenName,
                  to: pathInfo.relate.givenName,
                  rel: pathInfo.label,
                })}
              </p>
              <div className="flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    setHighlightPathIds(pathInfo.hops.map((h) => h.personId));
                    toast.success(
                      t("tree.pathHighlightActive", {
                        count: pathInfo.hops.length,
                      }),
                    );
                  }}
                >
                  <Eye className="h-3 w-3" />
                  {t("tree.showPathOnChart")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={copyPathText}
                >
                  <Copy className="h-3 w-3" />
                  {t("tree.copyPathText")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={sharePathWhatsApp}
                >
                  <MessageCircle className="h-3 w-3" />
                  {t("tree.sharePathWhatsApp")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setCertOpen(true)}
                >
                  <Printer className="h-3 w-3" />
                  {t("tree.printKinshipCert")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs"
                  onClick={() => {
                    const url = absoluteUrl(
                      buildSharePersonPath(shareToken, detail.id, {
                        relate: relateId,
                      }),
                    );
                    void navigator.clipboard.writeText(url);
                    toast.success(t("tree.pathLinkCopied"));
                  }}
                >
                  <LinkIcon className="h-3 w-3" />
                  {t("tree.copyPathLink")}
                </Button>
              </div>
            </div>
            {pathInfo.mrca && (
              <button
                type="button"
                onClick={() => openPerson(pathInfo.mrca!)}
                className="mb-1.5 inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950 hover:bg-amber-100"
              >
                {t("tree.commonAncestorAt", { name: pathInfo.mrca.givenName })}
              </button>
            )}
            <div className="flex flex-wrap items-center gap-0.5">
              {pathInfo.hops.map((hop, i) => {
                const p = peopleById.get(hop.personId);
                if (!p) return null;
                const isEnd = p.id === detail.id;
                const isRelate = p.id === relateId;
                const isMrca = pathInfo.mrca?.id === p.id;
                return (
                  <span
                    key={`${hop.personId}-${i}`}
                    className="inline-flex items-center gap-0.5"
                  >
                    {i > 0 && (
                      <ChevronLeft className="mx-0.5 h-3 w-3 shrink-0 text-sky-400 rtl:rotate-180" />
                    )}
                    <button
                      type="button"
                      onClick={() => openPerson(p)}
                      className={cn(
                        "inline-flex max-w-[7.5rem] truncate rounded-full px-2 py-0.5 text-[11px] font-medium transition hover:bg-white",
                        isEnd
                          ? "bg-sky-600 text-white"
                          : isRelate
                            ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300"
                            : isMrca
                              ? "bg-amber-100 text-amber-950 ring-1 ring-amber-300"
                              : "bg-white/80 text-sky-950 ring-1 ring-sky-200",
                      )}
                    >
                      {p.givenName}
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <OccasionsScopeChips
          className="mb-2"
          value={occasionsScope}
          onChange={(scope) => {
            setShareOccasionsScope(shareToken, scope);
            setOccasionsScopeState(scope);
          }}
        />

        <TodayEventsBanner
          treeId={treeId}
          people={occasionsPeople}
          rels={occasionsRels}
          onPersonClick={(p) => openPerson(p)}
          onAddToCalendar={shareOccasionCalendar}
          onCopyGreeting={shareOccasionGreeting}
          onWhatsAppGreeting={shareOccasionWhatsApp}
        />

        <EventsStrip
          people={occasionsPeople}
          rels={occasionsRels}
          onPersonClick={(p) => openPerson(p)}
          onSeeAll={() => setShowOccasionsPanel((v) => !v)}
          onPrintOccasion={(ev) => setPrintOccasion(ev)}
          onCopyPersonLink={(p) => {
            const url = absoluteUrl(buildSharePersonPath(shareToken, p.id));
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

        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={showPlacesPanel ? "secondary" : "outline"}
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowPlacesPanel((v) => !v)}
          >
            <MapPin className="h-3.5 w-3.5" />
            {showPlacesPanel
              ? t("share.hidePlaces")
              : t("share.showPlaces")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showPhotosPanel ? "secondary" : "outline"}
            className="h-8 gap-1.5 text-xs"
            onClick={() => setShowPhotosPanel((v) => !v)}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {showPhotosPanel
              ? t("share.hidePhotos")
              : t("share.showPhotos")}
          </Button>
        </div>

        {showPlacesPanel && (
          <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
            <PlacesBrowser
              people={people}
              rels={rels}
              kinshipFocusId={detail?.id ?? null}
              onPersonClick={(p) => openPerson(p)}
            />
          </div>
        )}

        {showPhotosPanel && (
          <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
            <PhotosGallery
              people={people}
              rels={rels}
              kinshipFocusId={detail?.id ?? null}
              favoriteIds={favoriteIds}
              onPersonClick={(p) => openPerson(p)}
            />
          </div>
        )}

        {showOccasionsPanel && (
          <div className="mb-4 rounded-2xl border bg-card p-4 shadow-sm">
            <OccasionsPanel
              people={occasionsPeople}
              rels={occasionsRels}
              onPersonClick={(p) => openPerson(p)}
              onPrintOccasion={(ev) => setPrintOccasion(ev)}
              onAddToCalendar={shareOccasionCalendar}
              onCopyGreeting={shareOccasionGreeting}
              onWhatsAppGreeting={shareOccasionWhatsApp}
              onDownloadUpcomingCalendar={downloadUpcomingOccasionsCalendar}
            />
          </div>
        )}

        <DiscoveriesPanel
          people={people}
          rels={rels}
          canWrite={false}
          homePersonId={detail?.id ?? people[0]?.id ?? null}
          favoriteIds={favoriteIds}
          onOpenPerson={(id) => {
            const p = peopleById.get(id);
            if (p) openPerson(p);
          }}
          onComparePair={(aId, bId) => {
            const a = peopleById.get(aId);
            if (!a) return;
            openPerson(a);
            setRelateId(bId);
            const hops = findRelationPath(aId, bId, people, rels);
            if (hops) {
              setHighlightPathIds(hops.map((h) => h.personId));
              toast.success(
                t("tree.pathHighlightActive", { count: hops.length }),
              );
            }
          }}
          onHighlightPair={(aId, bId) => {
            const hops = findRelationPath(aId, bId, people, rels);
            if (!hops) {
              toast.message(t("tree.howRelatedNone"));
              return;
            }
            setHighlightPathIds(hops.map((h) => h.personId));
            const a = peopleById.get(aId);
            if (a) openPerson(a);
            setRelateId(bId);
            toast.success(
              t("tree.pathHighlightActive", { count: hops.length }),
            );
          }}
        />

        <ShareCompletenessCard completeness={completeness} />

        <TreeGrowthChecklist
          people={people}
          rels={rels}
          focusPerson={detail ?? people[0] ?? null}
          canWrite={false}
          completenessScore={completeness.score}
        />

        <div className="mb-2 flex flex-wrap gap-1.5">
          {(
            [
              { id: "family" as const, icon: Network, label: t("chart.viewFamily") },
              { id: "pedigree" as const, icon: GitBranch, label: t("chart.viewPedigree") },
              { id: "fan" as const, icon: Fan, label: t("chart.viewFan") },
              {
                id: "descendants" as const,
                icon: ArrowDownToLine,
                label: t("chart.viewDescendants"),
              },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={chartView === id ? "secondary" : "outline"}
              className="h-8 gap-1.5 text-xs"
              onClick={() => setChartView(id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          ))}
        </div>

        <Card>
          <CardContent className="p-2">
            {chartView === "family" && (
              <FamilyChart
                people={people}
                rels={rels}
                selectedPersonId={detail?.id ?? null}
                centerRequest={centerRequest}
                highlightPathIds={highlightPathIds}
                onPersonClick={(p) => openPerson(p)}
              />
            )}
            {chartView === "pedigree" && chartFocusId != null && (
              <PedigreeView
                people={people}
                rels={rels}
                focusId={chartFocusId}
                selectedPersonId={detail?.id ?? null}
                kinshipFocusId={relateId ?? chartFocusId}
                onPersonClick={(p) => openPerson(p)}
                onFocusPerson={(p) => openPerson(p)}
              />
            )}
            {chartView === "fan" && chartFocusId != null && (
              <FanChartView
                people={people}
                rels={rels}
                focusId={chartFocusId}
                selectedPersonId={detail?.id ?? null}
                kinshipFocusId={relateId ?? chartFocusId}
                onPersonClick={(p) => openPerson(p)}
                onFocusPerson={(p) => openPerson(p)}
              />
            )}
            {chartView === "descendants" && chartFocusId != null && (
              <DescendantsView
                people={people}
                rels={rels}
                focusId={chartFocusId}
                selectedPersonId={detail?.id ?? null}
                kinshipFocusId={relateId ?? chartFocusId}
                onPersonClick={(p) => openPerson(p)}
                onFocusPerson={(p) => openPerson(p)}
              />
            )}
            {chartView !== "family" && chartFocusId == null && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {t("share.pickPersonForChart")}
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md">
          {detail && (() => {
            const { fatherId, motherId } = getParents(
              detail.id,
              rels,
              peopleById,
            );
            const father = fatherId ? peopleById.get(fatherId) : null;
            const mother = motherId ? peopleById.get(motherId) : null;
            const spouses = (spousesOf.get(detail.id) ?? [])
              .map((id) => peopleById.get(id))
              .filter((p): p is Person => !!p);
            const children = (childrenOf.get(detail.id) ?? [])
              .map((id) => peopleById.get(id))
              .filter((p): p is Person => !!p);
            const siblingIds = new Set<number>();
            for (const pid of [fatherId, motherId]) {
              if (pid == null) continue;
              for (const sid of childrenOf.get(pid) ?? []) {
                if (sid !== detail.id) siblingIds.add(sid);
              }
            }
            const siblings = [...siblingIds]
              .map((id) => peopleById.get(id))
              .filter((p): p is Person => !!p);
            const fullSiblings = [detail, ...siblings];
            const immediateMembers = [
              ...(father ? [{ person: father, role: "father" as const }] : []),
              ...(mother ? [{ person: mother, role: "mother" as const }] : []),
              ...spouses.map((p) => ({ person: p, role: "spouse" as const })),
              ...siblings.map((p) => ({ person: p, role: "sibling" as const })),
              ...children.map((p) => ({ person: p, role: "child" as const })),
            ];
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">
                    {detail.givenName}
                  </DialogTitle>
                  {detail.fatherName && (
                    <DialogDescription className="font-display">
                      {detail.fatherName}
                    </DialogDescription>
                  )}
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="space-y-1 text-muted-foreground">
                    {detail.kunya && (
                      <p>{t("share.kunyaLabel", { kunya: detail.kunya })}</p>
                    )}
                    <p>
                      {L.formatYears(
                        detail.birthYear,
                        detail.deathYear,
                        detail.isLiving,
                      )}
                    </p>
                    {pathInfo && (
                      <Badge variant="secondary" className="mt-1">
                        {pathInfo.label}
                        {" · "}
                        {pathInfo.relate.givenName}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => copyPersonCard(detail)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {t("tree.copyPersonCard")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => sharePersonWhatsApp(detail)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t("tree.sharePersonWhatsApp")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setQrPerson(detail)}
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      {t("share.showQR")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        downloadPersonVCard(detail, {
                          url: absoluteUrl(
                            buildSharePersonPath(shareToken, detail.id),
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
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        downloadPersonJson(detail, people, rels, {
                          url: absoluteUrl(
                            buildSharePersonPath(shareToken, detail.id),
                          ),
                          treeName: tree.name,
                        });
                        toast.success(t("detail.jsonDownloaded"));
                      }}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      {t("detail.downloadPersonJson")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        const url = absoluteUrl(
                          buildSharePersonPath(shareToken, detail.id, {
                            relate: relateId,
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
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => setProfilePrintOpen(true)}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      {t("tree.printPersonProfile")}
                    </Button>
                    {pathInfo && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={copyPathText}
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {t("tree.copyPathText")}
                      </Button>
                    )}
                    {pathInfo && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setCertOpen(true)}
                      >
                        <Printer className="h-3.5 w-3.5" />
                        {t("tree.printKinshipCert")}
                      </Button>
                    )}
                  </div>
                  <ImmediateFamilyStrip
                    members={immediateMembers}
                    people={people}
                    rels={rels}
                    onSelect={openPerson}
                  />
                  <BirthOrderStrip
                    siblings={fullSiblings}
                    focusId={detail.id}
                    people={people}
                    rels={rels}
                    onSelect={openPerson}
                  />
                  {relateId != null &&
                    peopleById.get(relateId) &&
                    relateId !== detail.id && (
                      <PathToHomeStrip
                        homePerson={peopleById.get(relateId)!}
                        detailPerson={detail}
                        people={people}
                        rels={rels}
                        onSelectHop={openPerson}
                        onHighlightPath={(ids) => {
                          setHighlightPathIds(ids);
                          toast.success(
                            t("tree.pathHighlightActive", {
                              count: ids.length,
                            }),
                          );
                        }}
                        onCopyPathLink={() => {
                          const url = absoluteUrl(
                            buildSharePersonPath(shareToken, detail.id, {
                              relate: relateId,
                            }),
                          );
                          void navigator.clipboard.writeText(url);
                          toast.success(t("tree.pathLinkCopied"));
                        }}
                        onCopyPathText={copyPathText}
                      />
                    )}
                  <PersonGapsStrip
                    person={detail}
                    people={people}
                    rels={rels}
                    canWrite={false}
                    onWhatsAppGaps={() => sharePersonGapsWhatsApp(detail)}
                  />
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <KinshipCertificateDialog
        open={certOpen}
        onOpenChange={setCertOpen}
        fromId={detail?.id ?? null}
        toId={relateId}
        people={people}
        rels={rels}
        treeName={tree.name}
        pathUrl={
          detail
            ? absoluteUrl(
                buildSharePersonPath(shareToken, detail.id, {
                  relate: relateId,
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
        homePersonId={detail?.id ?? null}
        treeName={tree.name}
        personUrl={
          printOccasion?.person
            ? absoluteUrl(
                buildSharePersonPath(shareToken, printOccasion.person.id),
              )
            : ""
        }
      />

      <FamilyBriefPrintDialog
        open={familyBriefPrintOpen}
        onOpenChange={setFamilyBriefPrintOpen}
        today={familyBriefPrintData.today}
        week={familyBriefPrintData.week}
        treeName={tree.name}
      />

      <PersonShareQrDialog
        open={!!qrPerson}
        onOpenChange={(o) => !o && setQrPerson(null)}
        url={
          qrPerson
            ? absoluteUrl(buildSharePersonPath(shareToken, qrPerson.id))
            : ""
        }
        personName={qrPerson?.givenName}
      />

      <PersonProfilePrintDialog
        open={profilePrintOpen}
        onOpenChange={setProfilePrintOpen}
        person={detail}
        people={people}
        rels={rels}
        treeName={tree.name}
        personUrl={
          detail
            ? absoluteUrl(buildSharePersonPath(shareToken, detail.id))
            : ""
        }
      />
    </div>
  );
}
