import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
  type PointerEvent as REPointerEvent,
  type ReactNode,
} from "react";
import type { Person, Relationship } from "@db/tables";
import type { TreeBranch } from "@db/tables";
import { useLabels } from "@/lib/labels";
import { useTranslation } from "react-i18next";
import { computePersonRanks, comparePeopleByBirth } from "@/lib/birthOrder";
import {
  childrenOfPair,
  childrenWithFatherOnly,
  collectReachableFromRoots,
  getParents,
  augmentSpousesFromCoParents,
  countDescendants,
  buildSpousesOf,
  findPrimaryBranchRootId,
} from "@/lib/familyGraph";
import PersonRankLines from "@/components/tree/PersonRankLines";
import {
  findSpouseRel,
  formatSpouseDates,
  sortSpouses,
} from "@/lib/spouseMeta";
import {
  BranchColumn,
  CoupleLink,
  SiblingFork,
  VLine,
} from "@/components/tree/ChartConnectors";
import { Baby, Minus, Plus, RotateCcw, Move, Maximize, Crosshair, AlertCircle } from "lucide-react";
import TwinBadge from "@/components/tree/TwinBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { displayGenerationNumber, printGenerationLevel } from "@/lib/printData";
import { buildSpouseNotesMap, preferredParentId } from "@/lib/printLineage";
import { parseLineageChain } from "@/lib/lineageParser";
import QuickAddMenu, {
  type QuickKinship,
} from "@/components/tree/QuickAddMenu";
import { relationToFocus } from "@/lib/relationshipLabel";
import type { PersonGap } from "@/lib/personGaps";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

type Labels = ReturnType<typeof useLabels>;

const PrintLevelsContext = createContext<Map<number, number> | null>(null);
const SpouseNotesContext = createContext<Map<number, string[]> | null>(null);

type PrintChartMeta = {
  levels: Map<number, number>;
  rels: Relationship[];
  byId: Map<number, Person>;
} | null;

const PrintChartContext = createContext<PrintChartMeta>(null);

const SideTreeContext = createContext<{
  personIds: Set<number>;
  onOpen: (person: Person) => void;
} | null>(null);

/** معرفات المتزوجين (رابط زوجية صريح أو مستنتج) */
const MarriedIdsContext = createContext<Set<number>>(new Set());
const SelectedPersonContext = createContext<number | null>(null);
const PathHighlightContext = createContext<Set<number> | null>(null);
const KinshipFocusContext = createContext<{
  focusId: number | null;
  people: Person[];
  rels: Relationship[];
} | null>(null);
const ChartActionsContext = createContext<{
  onFocusPerson?: (person: Person) => void;
  onHowRelated?: (person: Person) => void;
  onEditSpouse?: (rel: Relationship, a: Person, b: Person) => void;
  editSpouseTitle?: string;
} | null>(null);
const QuickAddContext = createContext<
  ((person: Person, kinship: QuickKinship) => void) | null
>(null);
const GapsContext = createContext<{
  gapsById: Map<number, PersonGap[]>;
  canWrite: boolean;
  onFixGap?: (
    person: Person,
    kind: PersonGap["kind"],
  ) => void;
} | null>(null);

/** ترتيب التوائم على المخطط: personId → { order, total } */
const TwinMetaContext = createContext<
  Map<number, { order: number; total: number }>
>(new Map());

type RemotePerson = Person & { linkId: number; forPersonId: number };

type Props = {
  people: Person[];
  rels: Relationship[];
  branches?: TreeBranch[];
  remotePeople?: RemotePerson[];
  onPersonClick?: (person: Person) => void;
  /** فتح شجرة شخص له فرع نسب جانبي (آباء خارج الشجرة الرئيسية) */
  onOpenSideTree?: (person: Person) => void;
  onToggleBranch?: (branchId: number, isHidden: boolean) => void;
  compact?: boolean;
  disablePanZoom?: boolean;
  /** تمييز البطاقة المحددة في لوحة التفاصيل */
  selectedPersonId?: number | null;
  /** طلب توسيط شخص (يتغيّر token لإعادة التوسيط) */
  centerRequest?: { personId: number; token: number } | null;
  /** إبراز مسار قرابة على المخطط (كيف يرتبطان) */
  highlightPathIds?: number[] | null;
  /** محور القرابة لمعاينة التحويم */
  kinshipFocusId?: number | null;
  onFocusPerson?: (person: Person) => void;
  onHowRelated?: (person: Person) => void;
  onEditSpouse?: (rel: Relationship, a: Person, b: Person) => void;
  /** إضافة قريب سريعة من البطاقة (+) مع اختيار الصلة */
  onQuickAdd?: (person: Person, kinship: QuickKinship) => void;
  /** نواقص البحث على البطاقات (نقطة كهرمانية) */
  gapsById?: Map<number, PersonGap[]>;
  canWriteGaps?: boolean;
  onFixGap?: (person: Person, kind: PersonGap["kind"]) => void;
  /** وضع التركيز: أظهر الشجرة من أعلى جد في النطاق (بما فيها جذور الفروع) */
  focusMode?: boolean;
  /** جذر الشجرة في الطباعة — بدلاً من اكتشاف أعلى جد تلقائياً */
  rootPersonId?: number;
  /** أجيال الطباعة — الجذر = 0 */
  printLevels?: Map<number, number>;
};

function isFemale(gender: string) {
  return gender === "female";
}

function isAlive(person: Person) {
  return person.isLiving === true || (person.isLiving as unknown) === 1;
}

/** ألوان بطاقات بأسلوب عائلي هادئ (أزرق/وردي فاتح) */
function genderTheme(gender: string, living: boolean) {
  const female = isFemale(gender);
  if (!living) {
    return female
      ? {
          bar: "#be185d",
          avatar: "#9f1239",
          ring: "ring-pink-200",
          bg: "bg-[#f8e8ef]",
          border: "border-pink-300/80",
          card: "#f3d6e2",
        }
      : {
          bar: "#1e40af",
          avatar: "#1e3a8a",
          ring: "ring-blue-200",
          bg: "bg-[#e4eef8]",
          border: "border-blue-300/80",
          card: "#d4e4f4",
        };
  }
  return female
    ? {
        bar: "#f9a8d4",
        avatar: "#db2777",
        ring: "ring-pink-100",
        bg: "bg-[#fce8f1]",
        border: "border-pink-200",
        card: "#fce8f1",
      }
    : {
        bar: "#93c5fd",
        avatar: "#2563eb",
        ring: "ring-blue-100",
        bg: "bg-[#e3f0fb]",
        border: "border-blue-200",
        card: "#e3f0fb",
      };
}

export default function FamilyChart({
  people,
  rels,
  branches = [],
  remotePeople = [],
  onPersonClick,
  onOpenSideTree,
  onToggleBranch,
  compact,
  disablePanZoom,
  selectedPersonId = null,
  centerRequest = null,
  highlightPathIds = null,
  kinshipFocusId = null,
  onFocusPerson,
  onHowRelated,
  onEditSpouse,
  onQuickAdd,
  gapsById,
  canWriteGaps = false,
  onFixGap,
  focusMode,
  rootPersonId,
  printLevels,
}: Props) {
  const L = useLabels();
  const { t } = useTranslation();
  const chartActions = useMemo(
    () => ({
      onFocusPerson,
      onHowRelated,
      onEditSpouse,
      editSpouseTitle: t("spouseDates.editLink"),
    }),
    [onFocusPerson, onHowRelated, onEditSpouse, t],
  );
  const gapsCtx = useMemo(
    () => ({
      gapsById: gapsById ?? new Map<number, PersonGap[]>(),
      canWrite: canWriteGaps,
      onFixGap,
    }),
    [gapsById, canWriteGaps, onFixGap],
  );
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pathHighlightSet = useMemo(
    () =>
      highlightPathIds && highlightPathIds.length > 0
        ? new Set(highlightPathIds)
        : null,
    [highlightPathIds],
  );
  const kinshipFocus = useMemo(
    () => ({
      focusId: kinshipFocusId,
      people,
      rels,
    }),
    [kinshipFocusId, people, rels],
  );

  const graph = useMemo(() => {
    const byId = new Map<number, Person>(people.map((p) => [p.id, p]));
    const childrenOf = new Map<number, number[]>();
    const childIds = new Set<number>();

    for (const r of rels) {
      if (!byId.has(r.fromPersonId) || !byId.has(r.toPersonId)) continue;
      if (r.type === "parent") {
        childIds.add(r.toPersonId);
        const kids = childrenOf.get(r.fromPersonId) ?? [];
        if (!kids.includes(r.toPersonId)) kids.push(r.toPersonId);
        childrenOf.set(r.fromPersonId, kids);
      }
    }

    for (const [pid, kids] of childrenOf) {
      kids.sort((a, b) => {
        const pa = byId.get(a);
        const pb = byId.get(b);
        if (!pa || !pb) return 0;
        return comparePeopleByBirth(pa, pb);
      });
      childrenOf.set(pid, kids);
    }

    // روابط زوجية صريحة + استنتاج من الأبوين المشتركين لنفس الابن
    const spousesOf = augmentSpousesFromCoParents(
      rels,
      byId,
      buildSpousesOf(rels),
    );

    const hiddenBranchIds = new Set(
      branches.filter((b) => b.isHidden).map((b) => b.id),
    );
    const branchRootIds = new Set(branches.map((b) => b.rootPersonId));
    const branchMemberIds = new Set(
      people.filter((p) => p.branchId != null).map((p) => p.id),
    );
    // جذر الخط الرئيسي (أكبر فرع) يُعرض في المخطط — لا يُستبعد كفرع جانبي
    const primaryBranchRootId = findPrimaryBranchRootId(people, branches);

    const rawRoots = people.filter((p) => {
      if (childIds.has(p.id)) return false;
      // جذور فروع الأزواج الجانبية لا تظهر كشجرة منفصلة — باستثناء الخط الرئيسي
      if (
        !printLevels &&
        !focusMode &&
        branchRootIds.has(p.id) &&
        p.id !== primaryBranchRootId
      ) {
        return false;
      }
      if (p.id === primaryBranchRootId) return true;
      if (p.branchId && hiddenBranchIds.has(p.branchId) && !focusMode) {
        const hasSpouseInMain = (spousesOf.get(p.id) ?? []).some((sid) => {
          const s = byId.get(sid);
          return s && (!s.branchId || !hiddenBranchIds.has(s.branchId));
        });
        return hasSpouseInMain;
      }
      return true;
    });
    const spouseOfDescendant = new Set<number>();
    for (const [personId, spouseIds] of spousesOf) {
      if (childIds.has(personId)) {
        for (const sid of spouseIds) spouseOfDescendant.add(sid);
      }
    }

    const shownAsSpouse = new Set<number>();
    const orderedRoots: Person[] = [];
    const sortedRaw = [...rawRoots].sort((a, b) => {
      if (a.gender !== b.gender) return isFemale(a.gender) ? 1 : -1;
      return a.givenName.localeCompare(b.givenName, "ar");
    });
    for (const root of sortedRaw) {
      if (spouseOfDescendant.has(root.id) || shownAsSpouse.has(root.id)) continue;
      orderedRoots.push(root);
      for (const sid of spousesOf.get(root.id) ?? []) {
        if (!childIds.has(sid)) shownAsSpouse.add(sid);
      }
    }
    if (orderedRoots.length === 0 && people.length > 0) {
      const fallback = people.find((p) => !branchRootIds.has(p.id)) ?? people[0];
      orderedRoots.push(fallback);
    }

    // لا نضيف جذور الفروع كأشجار مكدّسة في الأسفل — تُفتح من مؤشر الدائرة
    // (في وضع التركيز أو الطباعة نسمح بها لتظهر سلسلة النسب كاملة)
    if (printLevels || focusMode) {
      for (const br of branches) {
        if (br.isHidden && !focusMode) continue;
        const rootPerson = byId.get(br.rootPersonId);
        if (
          rootPerson &&
          !childIds.has(rootPerson.id) &&
          !orderedRoots.some((r) => r.id === rootPerson.id)
        ) {
          orderedRoots.push(rootPerson);
        }
      }
    }

    // اعرض من أعلى جد — امشِ للأعلى من أي جذر محتمل
    const resolveTopmost = (startId: number): number => {
      let current = startId;
      const seen = new Set<number>();
      for (let i = 0; i < 40; i++) {
        const { fatherId, motherId } = getParents(current, rels, byId);
        const parentId = fatherId ?? motherId;
        if (!parentId || seen.has(parentId)) break;
        seen.add(parentId);
        current = parentId;
      }
      return current;
    };

    const isAncestorOf = (ancestorId: number, personId: number): boolean => {
      const queue = [personId];
      const seen = new Set<number>();
      while (queue.length > 0) {
        const current = queue.shift()!;
        if (seen.has(current)) continue;
        seen.add(current);
        const { fatherId, motherId } = getParents(current, rels, byId);
        for (const parentId of [fatherId, motherId]) {
          if (parentId == null || !byId.has(parentId)) continue;
          if (parentId === ancestorId) return true;
          if (!seen.has(parentId)) queue.push(parentId);
        }
      }
      return false;
    };

    const topRootById = new Map<number, Person>();
    for (const r of orderedRoots) {
      const topId = resolveTopmost(r.id);
      const top = byId.get(topId);
      if (top) topRootById.set(topId, top);
    }
    const mergedRoots = [...topRootById.values()].sort((a, b) => {
      if (a.gender !== b.gender) return isFemale(a.gender) ? 1 : -1;
      return a.givenName.localeCompare(b.givenName, "ar");
    });
    let finalRoots = mergedRoots.filter(
      (r) =>
        !mergedRoots.some(
          (other) => other.id !== r.id && isAncestorOf(other.id, r.id),
        ),
    );

    // استبعد جذراً إن كان زوجاً لمن ينحدر من جذر آخر (يمنع انفصال الزوجة كشجرة مستقلة)
    finalRoots = finalRoots.filter((r) => {
      const spouseIds = spousesOf.get(r.id) ?? [];
      return !spouseIds.some((sid) =>
        finalRoots.some(
          (other) =>
            other.id !== r.id &&
            (sid === other.id || isAncestorOf(other.id, sid)),
        ),
      );
    });

    const isConnected = (p: Person) =>
      (childrenOf.get(p.id)?.length ?? 0) > 0 ||
      (spousesOf.get(p.id)?.length ?? 0) > 0;

    const dedupedRoots = finalRoots.filter((r) => {
      const sameName = people.filter((p) => p.givenName === r.givenName);
      if (sameName.length <= 1) return true;
      if (isConnected(r)) return true;
      return !sameName.some((p) => p.id !== r.id && isConnected(p));
    });

    const remoteByLocal = new Map<number, RemotePerson[]>();
    for (const rp of remotePeople) {
      const arr = remoteByLocal.get(rp.forPersonId) ?? [];
      arr.push(rp);
      remoteByLocal.set(rp.forPersonId, arr);
    }

    const ranks = new Map(
      people.map((p) => [p.id, computePersonRanks(p, people, rels)]),
    );

    const displayRoots = (() => {
      if (rootPersonId != null && !focusMode) {
        const rp = byId.get(rootPersonId);
        if (rp) return [rp];
      }
      const base =
        dedupedRoots.length > 0
          ? dedupedRoots
          : finalRoots.length > 0
            ? finalRoots
            : orderedRoots;
      const filtered =
        printLevels || focusMode
          ? base
          : base.filter(
              (r) =>
                !branchRootIds.has(r.id) || r.id === primaryBranchRootId,
            );

      // الصفحة الرئيسية: جذر واحد (الأكثر أحفاداً) حتى لا تنقسم الشجرة أفقياً
      if (!printLevels && !focusMode && filtered.length > 1) {
        const scored = [...filtered].sort((a, b) => {
          const da = countDescendants(a.id, childrenOf);
          const db = countDescendants(b.id, childrenOf);
          if (db !== da) return db - da;
          if (a.gender !== b.gender) return isFemale(a.gender) ? 1 : -1;
          return a.givenName.localeCompare(b.givenName, "ar");
        });
        return scored.slice(0, 1);
      }
      return filtered;
    })();
    const reachable = collectReachableFromRoots(
      displayRoots.map((r) => r.id),
      childrenOf,
      spousesOf,
    );

    // أشخاص في الشجرة الرئيسية لديهم آباء خارجها أو نسب متسلسل غير مربوط → مؤشر فرع نسب
    const sideTreePersonIds = new Set<number>();
    if (!printLevels) {
      for (const id of reachable) {
        const person = byId.get(id);
        if (!person) continue;
        const { fatherId, motherId } = getParents(id, rels, byId);
        const outsideParent = [fatherId, motherId].some(
          (pid) => pid != null && byId.has(pid) && !reachable.has(pid),
        );
        if (outsideParent) {
          sideTreePersonIds.add(id);
          continue;
        }
        // نسب مكتوب دون أب مربوط بعلاقة — يظهر المؤشر ويُنشأ الربط عند الفتح
        if (
          !fatherId &&
          person.fatherName?.trim() &&
          parseLineageChain(person.fatherName).segments.length > 0
        ) {
          sideTreePersonIds.add(id);
        }
      }
    }

    const branchOnlyIds = new Set<number>();
    for (const br of branches) {
      const brReach = collectReachableFromRoots([br.rootPersonId], childrenOf, spousesOf);
      // أضف أيضاً سلسلة الآباء من جذر الفرع
      let cur: number | undefined = br.rootPersonId;
      const seen = new Set<number>();
      while (cur && byId.has(cur) && !seen.has(cur)) {
        seen.add(cur);
        brReach.add(cur);
        const { fatherId, motherId } = getParents(cur, rels, byId);
        cur = fatherId ?? motherId ?? undefined;
      }
      for (const id of brReach) {
        if (!reachable.has(id)) branchOnlyIds.add(id);
      }
    }
    for (const id of branchMemberIds) {
      if (!reachable.has(id)) branchOnlyIds.add(id);
    }

    const orphans = printLevels
      ? []
      : people.filter((p) => !reachable.has(p.id) && !branchOnlyIds.has(p.id));

    return {
      byId,
      childrenOf,
      spousesOf,
      roots:
        displayRoots.length > 0
          ? displayRoots
          : orderedRoots
              .filter(
                (r) =>
                  !branchRootIds.has(r.id) || r.id === primaryBranchRootId,
              )
              .slice(0, 1),
      orphans,
      ranks,
      remoteByLocal,
      branchRootIds,
      branches,
      sideTreePersonIds,
    };
  }, [people, rels, branches, remotePeople, rootPersonId, printLevels, focusMode]);

  const sideTreeCtx = useMemo(
    () =>
      onOpenSideTree
        ? {
            personIds: graph.sideTreePersonIds,
            onOpen: onOpenSideTree,
          }
        : null,
    [graph.sideTreePersonIds, onOpenSideTree],
  );

  const marriedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const [pid, spouses] of graph.spousesOf) {
      if (spouses.length > 0) {
        ids.add(pid);
        for (const sid of spouses) ids.add(sid);
      }
    }
    for (const rp of remotePeople) {
      ids.add(rp.forPersonId);
      ids.add(rp.id);
    }
    return ids;
  }, [graph.spousesOf, remotePeople]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const centerOnPersonId = useCallback((personId: number) => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || disablePanZoom) return;
    const card = content.querySelector(
      `[data-person-id="${personId}"]`,
    ) as HTMLElement | null;
    if (!card) return;

    const vRect = viewport.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const dx =
      vRect.left + vRect.width / 2 - (cardRect.left + cardRect.width / 2);
    const dy =
      vRect.top + vRect.height / 2 - (cardRect.top + cardRect.height / 2);
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, [disablePanZoom]);

  const fitToView = useCallback(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content || disablePanZoom) return;
    // أعد القياس بدون تحويل مؤقتاً عبر حساب scrollWidth/Height
    const pad = 48;
    const vw = viewport.clientWidth - pad;
    const vh = viewport.clientHeight - pad;
    // reverse current transform to estimate natural size
    const naturalW = content.scrollWidth;
    const naturalH = content.scrollHeight;
    if (naturalW <= 0 || naturalH <= 0 || vw <= 0 || vh <= 0) {
      resetView();
      return;
    }
    const scale = Math.min(2.2, Math.max(0.35, Math.min(vw / naturalW, vh / naturalH)));
    const rounded = Math.round(scale * 100) / 100;
    setZoom(rounded);
    setPan({ x: 0, y: 0 });
  }, [disablePanZoom, resetView]);

  useEffect(() => {
    if (!centerRequest || disablePanZoom) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        centerOnPersonId(centerRequest.personId);
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [centerRequest, centerOnPersonId, disablePanZoom]);

  // ضبط حجم الشجرة للطباعة: يلائم العرض والارتفاع معاً
  useEffect(() => {
    if (!disablePanZoom) return;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const clearFit = () => {
      content.style.transform = "";
      content.style.transformOrigin = "";
      content.style.marginBottom = "";
      content.style.marginInlineEnd = "";
      content.style.marginLeft = "";
      content.style.marginRight = "";
      content.style.removeProperty("zoom");
      viewport.style.minHeight = "";
      viewport.style.height = "";
      viewport.style.overflow = "";
    };

    const fit = () => {
      clearFit();

      const availableW = Math.max(0, viewport.clientWidth - 8);
      // حد ارتفاع الطباعة التقريبي (صفحة أفقية بعد الهوامش)
      const availableH = Math.max(280, Math.min(920, window.innerHeight * 0.72));
      const neededW = content.scrollWidth;
      const neededH = content.scrollHeight;
      if (neededW <= 0 || neededH <= 0) return;

      const scaleW = availableW > 0 ? availableW / neededW : 1;
      const scaleH = availableH / neededH;
      const scale = Math.max(0.22, Math.min(1, Math.min(scaleW, scaleH)));

      if (scale < 0.999) {
        const supportsZoom =
          typeof CSS !== "undefined" &&
          typeof CSS.supports === "function" &&
          CSS.supports("zoom", "1");
        if (supportsZoom) {
          content.style.setProperty("zoom", String(scale));
          viewport.style.minHeight = `${Math.ceil(neededH * scale) + 24}px`;
          viewport.style.overflow = "hidden";
        } else {
          content.style.transform = `scale(${scale})`;
          content.style.transformOrigin = "top center";
          content.style.marginBottom = `${-Math.ceil(neededH * (1 - scale))}px`;
          content.style.marginInlineEnd = `${-Math.ceil(neededW * (1 - scale))}px`;
          viewport.style.minHeight = `${Math.ceil(neededH * scale) + 24}px`;
          viewport.style.height = `${Math.ceil(neededH * scale) + 24}px`;
          viewport.style.overflow = "hidden";
        }
      } else {
        viewport.style.minHeight = `${neededH + 16}px`;
      }
    };

    const schedule = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(fit);
      });
    };

    schedule();
    const onBeforePrint = () => {
      fit();
      window.setTimeout(fit, 30);
      window.setTimeout(fit, 120);
    };
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => schedule())
        : null;
    ro?.observe(viewport);
    window.addEventListener("resize", schedule);
    window.addEventListener("beforeprint", onBeforePrint);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("beforeprint", onBeforePrint);
      clearFit();
    };
  }, [disablePanZoom, people, rels, branches, compact, printLevels]);

  const onPointerDown = useCallback(
    (e: REPointerEvent<HTMLDivElement>) => {
      if (disablePanZoom || e.button !== 0) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("button, a, input, textarea, select, [data-no-pan]")) return;
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [disablePanZoom],
  );

  const onPointerMove = useCallback((e: REPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    if (disablePanZoom) return;
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => Math.min(2.2, Math.max(0.35, Math.round((z + delta) * 100) / 100)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [disablePanZoom]);

  const zoomBy = (delta: number) => {
    setZoom((z) => Math.min(2.2, Math.max(0.35, Math.round((z + delta) * 100) / 100)));
  };

  if (people.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Baby className="h-12 w-12 mb-4 opacity-40" />
        <p className="text-lg font-medium">{t("tree.emptyChart")}</p>
        <p className="text-sm">{t("tree.emptyChartHint")}</p>
      </div>
    );
  }

  const hasRels = rels.length > 0;

  const twinMeta = useMemo(() => {
    const map = new Map<number, { order: number; total: number }>();
    const byGroup = new Map<number, Person[]>();
    for (const p of people) {
      if (p.twinGroupId == null) continue;
      const arr = byGroup.get(p.twinGroupId) ?? [];
      arr.push(p);
      byGroup.set(p.twinGroupId, arr);
    }
    for (const group of byGroup.values()) {
      if (group.length < 2) continue;
      const sorted = [...group].sort(comparePeopleByBirth);
      sorted.forEach((p, i) => {
        map.set(p.id, { order: i + 1, total: sorted.length });
      });
    }
    return map;
  }, [people]);

  const printSpouseNotes = useMemo(
    () => (printLevels ? buildSpouseNotesMap(people, rels) : null),
    [printLevels, people, rels],
  );

  return (
    <PrintLevelsContext.Provider value={printLevels ?? null}>
    <SpouseNotesContext.Provider value={printSpouseNotes}>
    <PrintChartContext.Provider
      value={
        printLevels
          ? { levels: printLevels, rels, byId: graph.byId }
          : null
      }
    >
    <TwinMetaContext.Provider value={twinMeta}>
    <SideTreeContext.Provider value={sideTreeCtx}>
    <MarriedIdsContext.Provider value={marriedIds}>
    <SelectedPersonContext.Provider value={selectedPersonId ?? null}>
    <PathHighlightContext.Provider value={pathHighlightSet}>
    <KinshipFocusContext.Provider value={kinshipFocus}>
    <ChartActionsContext.Provider value={chartActions}>
    <QuickAddContext.Provider value={onQuickAdd ?? null}>
    <GapsContext.Provider value={gapsCtx}>
    <div className="relative w-full min-w-0 max-w-full">
      {/* شريط الأدوات داخل المخطط */}
      {!disablePanZoom && (
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-md border border-blue-200 bg-[#e3f0fb]" /> {t("common.male")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 rounded-md border border-pink-200 bg-[#fce8f1]" /> {t("common.female")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-5 rounded border-2 border-amber-500 bg-amber-50" />{" "}
            {t("chart.marriedBorder")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-5 rounded border-2 border-stone-900 bg-stone-100" />{" "}
            {t("chart.deceasedBorder")}
          </span>
        </div>

          <div className="flex items-center gap-1 rounded-xl border bg-card p-0.5 shadow-sm">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => zoomBy(0.1)}
              title={t("chart.zoomIn")}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => zoomBy(-0.1)}
              title={t("chart.zoomOut")}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => {
                if (selectedPersonId != null) centerOnPersonId(selectedPersonId);
              }}
              title={t("chart.centerOnSelected")}
              disabled={selectedPersonId == null}
            >
              <Crosshair className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={fitToView}
              title={t("chart.fitToView")}
            >
              <Maximize className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={resetView}
              title={t("chart.reset")}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <span className="min-w-[3rem] px-1 text-center text-[11px] tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
          </div>
      </div>
      )}

      {!disablePanZoom && !hasRels && people.length > 1 && (
        <p className="mb-2 text-center text-xs sm:text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t("tree.noRelsHint")}
        </p>
      )}

      {/* منطقة العرض: عرض ثابت، تمركز بـ flex (آمن مع RTL) */}
      <div
        ref={viewportRef}
        className={cn(
          "relative w-full min-w-0 max-w-full rounded-2xl border border-stone-200/80",
          !disablePanZoom &&
            "h-[min(70vh,720px)] sm:h-[min(75vh,780px)] cursor-grab active:cursor-grabbing select-none overflow-hidden bg-[#ececec]",
          disablePanZoom &&
            "chart-print-viewport min-h-[320px] overflow-hidden py-4 print:border-0 print:bg-transparent bg-stone-100",
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {!disablePanZoom && (
          <p className="pointer-events-none absolute bottom-2 end-2 z-10 hidden sm:flex items-center gap-1 rounded-full border bg-card/90 px-2.5 py-1 text-[10px] text-muted-foreground shadow-sm">
            <Move className="h-3 w-3" /> {t("chart.dragHint")}
          </p>
        )}

        <div
          className={cn(
            "flex h-full w-full items-start justify-center pt-5",
            disablePanZoom ? "overflow-hidden" : "overflow-hidden",
          )}
          dir="ltr"
        >
          <div
            ref={contentRef}
            className={cn("shrink-0", disablePanZoom && "chart-print-content")}
            style={{
              transform: disablePanZoom
                ? undefined
                : `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: "top center",
              willChange: disablePanZoom ? undefined : "transform",
            }}
          >
            <div className="flex flex-col items-center gap-0 px-2" dir="rtl">
              {graph.roots.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10">{t("tree.emptyChart")}</p>
              ) : (
                graph.roots.map((root, i) => (
                  <div
                    key={root.id}
                    className={cn(
                      "flex flex-col items-center",
                      i > 0 && "mt-12 border-t border-dashed border-slate-200 pt-8",
                    )}
                  >
                    {printLevels && (
                      <PrintAncestorsAboveRoot
                        rootId={root.id}
                        graph={graph}
                        rels={rels}
                        compact={compact}
                        onPersonClick={onPersonClick}
                        L={L}
                        t={t}
                      />
                    )}
                    <CoupleNode
                      focusId={root.id}
                      depth={0}
                      byId={graph.byId}
                      childrenOf={graph.childrenOf}
                      spousesOf={graph.spousesOf}
                      rels={rels}
                      ranks={graph.ranks}
                      remoteByLocal={graph.remoteByLocal}
                      onPersonClick={onPersonClick}
                      compact={compact}
                      visited={new Set()}
                      L={L}
                      t={t}
                    />
                  </div>
                ))
              )}
              {graph.orphans.length > 0 && !printLevels && (
                <div className="mt-10 w-full border-t border-dashed border-amber-300 pt-6">
                  <p className="mb-3 text-center text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    {t("chart.unlinkedPeople", { count: graph.orphans.length })}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {graph.orphans.map((p) => (
                      <PersonCard
                        key={p.id}
                        person={p}
                        depth={0}
                        compact={compact}
                        ranks={graph.ranks.get(p.id)}
                        onPersonClick={onPersonClick}
                        L={L}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </GapsContext.Provider>
    </QuickAddContext.Provider>
    </ChartActionsContext.Provider>
    </KinshipFocusContext.Provider>
    </PathHighlightContext.Provider>
    </SelectedPersonContext.Provider>
    </MarriedIdsContext.Provider>
    </SideTreeContext.Provider>
    </TwinMetaContext.Provider>
    </PrintChartContext.Provider>
    </SpouseNotesContext.Provider>
    </PrintLevelsContext.Provider>
  );
}

function PrintAncestorsAboveRoot({
  rootId,
  graph,
  rels,
  compact,
  onPersonClick,
  L,
  t,
}: {
  rootId: number;
  graph: {
    byId: Map<number, Person>;
    ranks: Map<number, ReturnType<typeof computePersonRanks>>;
  };
  rels: Relationship[];
  compact?: boolean;
  onPersonClick?: (person: Person) => void;
  L: Labels;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const printLevels = useContext(PrintLevelsContext);
  if (!printLevels) return null;

  const { fatherId, motherId } = getParents(rootId, rels, graph.byId);
  const parents = [fatherId, motherId]
    .map((id) => (id != null ? graph.byId.get(id) : undefined))
    .filter((p): p is Person => !!p && printLevels.has(p.id));

  const unique = [...new Map(parents.map((p) => [p.id, p])).values()];
  if (unique.length === 0) return null;

  unique.sort((a, b) => {
    if (a.gender !== b.gender) return isFemale(a.gender) ? 1 : -1;
    return a.givenName.localeCompare(b.givenName, "ar");
  });

  return (
    <div className="flex flex-col items-center mb-0">
      <CoupleCardsRow
        couple={unique}
        focusId={unique[0]?.id}
        rels={rels}
        depth={-1}
        ranks={graph.ranks}
        onPersonClick={onPersonClick}
        compact={compact}
        spouseDates={{}}
        externalSpouses={[]}
        L={L}
        t={t}
      />
      <VLine h={18} />
    </div>
  );
}

function ExternalSpouseCard({
  person,
  compact,
  t,
}: {
  person: Person;
  compact?: boolean;
  t: (k: string) => string;
}) {
  const theme = genderTheme(person.gender, isAlive(person));
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border-2 border-dashed shadow-sm text-start",
        theme.border,
        theme.bg,
        compact ? "w-[7.5rem] p-1.5" : "w-[9.25rem] sm:w-[10rem] p-2",
      )}
    >
      <span className="absolute inset-x-0 top-0 h-1 opacity-60" style={{ backgroundColor: theme.bar }} />
      <p className="text-[8px] text-violet-600 font-medium mb-1">{t("chart.externalSpouse")}</p>
      <p className={cn("font-bold truncate", compact ? "text-xs" : "text-[13px]")}>
        {person.givenName}
      </p>
      {person.fatherName && (
        <p className="text-[9px] text-muted-foreground line-clamp-2 mt-1">{person.fatherName}</p>
      )}
    </div>
  );
}

function PersonCard({
  person,
  depth,
  compact,
  ranks,
  onPersonClick,
  L,
  t,
  chartMode = true,
}: {
  person: Person;
  depth: number;
  compact?: boolean;
  ranks: ReturnType<typeof computePersonRanks> | undefined;
  onPersonClick?: (person: Person) => void;
  L: Labels;
  t: (k: string, o?: Record<string, unknown>) => string;
  chartMode?: boolean;
}) {
  const printLevels = useContext(PrintLevelsContext);
  const printChart = useContext(PrintChartContext);
  const spouseNotesCtx = useContext(SpouseNotesContext);
  const spouseNotes = spouseNotesCtx?.get(person.id) ?? [];
  const sideTree = useContext(SideTreeContext);
  const printLevel =
    printChart != null
      ? printGenerationLevel(person, printChart.levels, printChart.rels, printChart.byId)
      : printLevels?.get(person.id);
  const living = isAlive(person);
  const theme = genderTheme(person.gender, living);
  const years = L.formatYears(person.birthYear, person.deathYear, living);
  const hasSideTree = Boolean(sideTree?.personIds.has(person.id));
  const marriedIds = useContext(MarriedIdsContext);
  const selectedId = useContext(SelectedPersonContext);
  const pathHighlight = useContext(PathHighlightContext);
  const kinshipCtx = useContext(KinshipFocusContext);
  const chartActions = useContext(ChartActionsContext);
  const onQuickAdd = useContext(QuickAddContext);
  const gapsCtx = useContext(GapsContext);
  const twinInfo = useContext(TwinMetaContext).get(person.id);
  const isMarried = marriedIds.has(person.id);
  const isSelected = selectedId === person.id;
  const female = isFemale(person.gender);
  const onPath = pathHighlight?.has(person.id) ?? false;
  const dimmed = pathHighlight != null && !onPath;
  const relationKey =
    kinshipCtx?.focusId != null
      ? relationToFocus(
          kinshipCtx.focusId,
          person.id,
          kinshipCtx.people,
          kinshipCtx.rels,
        )
      : null;
  const personGaps = gapsCtx?.gapsById.get(person.id) ?? [];
  const hasResearch = personGaps.length > 0;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center pb-1.5 transition",
        dimmed && "opacity-30 grayscale-[40%]",
        onPath && "z-[3]",
      )}
      data-person-id={person.id}
    >
      {hasSideTree && sideTree && (
        <button
          type="button"
          data-no-pan
          title={t("chart.openSideTree")}
          aria-label={t("chart.openSideTree")}
          onClick={(e) => {
            e.stopPropagation();
            sideTree.onOpen(person);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="z-[2] mb-0.5 flex flex-col items-center gap-0 rounded-md px-1 pt-0.5 hover:bg-violet-50 transition group"
        >
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-violet-500 bg-white shadow-sm group-hover:bg-violet-100 group-hover:scale-110 transition" />
          <span className="h-2.5 w-px bg-violet-400" />
        </button>
      )}
      <HoverCard openDelay={280} closeDelay={80}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            data-no-pan
            title={
              !living
                ? t("chart.deceasedBorder")
                : isMarried
                  ? t("chart.marriedBorder")
                  : undefined
            }
            onClick={(e) => {
              e.stopPropagation();
              onPersonClick?.(person);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              chartActions?.onFocusPerson?.(person);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              "relative z-[1] flex shrink-0 cursor-pointer flex-col items-center text-center transition",
              "rounded-2xl border shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-md hover:-translate-y-0.5",
              theme.bg,
              twinInfo
                ? "border-violet-500 border-[2.5px] ring-2 ring-violet-300/70 print:border-violet-700 print:ring-violet-400"
                : !living
                  ? "border-stone-800 border-[2px]"
                  : isMarried
                    ? "border-amber-400 border-[2px]"
                    : cn("border", theme.border),
              isSelected && "ring-2 ring-sky-500 ring-offset-2 ring-offset-[#ececec]",
              onPath &&
                !isSelected &&
                !twinInfo &&
                "ring-2 ring-violet-500 ring-offset-2 ring-offset-[#ececec] shadow-[0_0_0_3px_rgba(139,92,246,0.25)]",
              compact
                ? "w-[6.75rem] px-2 pb-2.5 pt-2"
                : "w-[7.75rem] sm:w-[8.25rem] px-2.5 pb-3 pt-2.5",
            )}
          >
            {hasResearch && (
              <span
                className="absolute -end-1 -top-1 z-[2] flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-0.5 text-[8px] font-bold text-white shadow-sm ring-2 ring-[#ececec]"
                title={t("chart.researchDot", { count: personGaps.length })}
              >
                {personGaps.length > 1 ? personGaps.length : ""}
                {personGaps.length === 1 && (
                  <AlertCircle className="h-2.5 w-2.5" />
                )}
              </span>
            )}
            {twinInfo && (
              <span className="absolute -start-1.5 -top-1.5 z-[3]">
                <TwinBadge
                  compact
                  order={twinInfo.order}
                  total={twinInfo.total}
                />
              </span>
            )}
            <span
              className={cn(
                "relative mb-1.5 flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm",
                female ? "ring-2 ring-pink-300" : "ring-2 ring-sky-300",
                compact ? "h-11 w-11" : "h-14 w-14 sm:h-[3.75rem] sm:w-[3.75rem]",
              )}
            >
              {person.photoUrl ? (
                <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span
                  className="flex h-full w-full items-center justify-center text-white"
                  style={{ backgroundColor: theme.avatar }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={cn(compact ? "h-6 w-6" : "h-8 w-8", "opacity-90")}
                    fill="currentColor"
                    aria-hidden
                  >
                    <circle cx="12" cy="8" r="3.5" />
                    <path d="M5 19.5c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5" />
                  </svg>
                </span>
              )}
              {!living && (
                <span className="absolute -bottom-0.5 inset-x-0 mx-auto w-fit rounded bg-stone-900 px-1 text-[7px] font-bold leading-tight text-white">
                  {t("common.deceased")}
                </span>
              )}
            </span>

            <p
              className={cn(
                "w-full font-semibold leading-snug text-stone-900",
                compact ? "text-[11px]" : "text-xs sm:text-[13px]",
                !living && "text-stone-600",
              )}
            >
              <span
                className={cn(
                  "line-clamp-2",
                  !living && "line-through decoration-stone-500",
                )}
              >
                {person.givenName}
              </span>
            </p>

            {printLevels && spouseNotes.length > 0 && (
              <p className="mt-0.5 w-full line-clamp-2 text-[8px] font-medium leading-tight text-amber-800/90">
                {spouseNotes.join(" · ")}
              </p>
            )}

            {!compact && person.fatherName && (
              <p className="mt-0.5 w-full truncate text-[9px] leading-tight text-stone-500 font-display">
                {person.fatherName.split(/\s+/).slice(0, 3).join(" ")}
              </p>
            )}

            {years && (
              <p className="mt-1 w-full truncate text-[9px] leading-none text-stone-500">
                {years}
              </p>
            )}

            {!compact && !chartMode && (
              <div className="mt-1 w-full">
                <PersonRankLines ranks={ranks} gender={person.gender} t={t} dense />
              </div>
            )}

            <p className="mt-1 text-[8px] text-stone-400 leading-none">
              {printLevel != null
                ? printLevel < 0
                  ? t("printPage.ancestorLabel", { n: Math.abs(printLevel) })
                  : printLevel === 0
                    ? t("chart.generationRoot")
                    : t("chart.generationN", {
                        n: displayGenerationNumber(printLevel),
                      })
                : depth === 0
                  ? t("chart.generationRoot")
                  : t("chart.generationN", { n: depth + 1 })}
            </p>

            <span
              className={cn(
                "pointer-events-none absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-e",
                theme.bg,
                !living
                  ? "border-stone-800"
                  : isMarried
                    ? "border-amber-400"
                    : female
                      ? "border-pink-200"
                      : "border-blue-200",
              )}
              aria-hidden
            />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          side="top"
          className="w-56 p-3"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 overflow-hidden rounded-full text-white",
                female ? "bg-pink-500" : "bg-sky-600",
              )}
            >
              {person.photoUrl ? (
                <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm">
                  {person.givenName.slice(0, 1)}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{person.givenName}</p>
              {years && (
                <p className="text-[11px] text-muted-foreground">{years}</p>
              )}
              {relationKey && (
                <p className="mt-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                  {t(`tree.rel.${relationKey}`)}
                </p>
              )}
            </div>
          </div>
          <div className="mt-2.5 grid gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 w-full text-xs"
              onClick={() => onPersonClick?.(person)}
            >
              {t("chart.openProfile")}
            </Button>
            {chartActions?.onFocusPerson && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-full text-xs"
                onClick={() => chartActions.onFocusPerson?.(person)}
              >
                {t("chart.focusHere")}
              </Button>
            )}
            {chartActions?.onHowRelated && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 w-full text-xs"
                onClick={() => chartActions.onHowRelated?.(person)}
              >
                {t("tree.howRelatedTitle")}
              </Button>
            )}
            {hasResearch && (
              <div className="mt-1 space-y-1 rounded-lg border border-amber-200/80 bg-amber-50/60 p-1.5">
                <p className="px-1 text-[10px] font-semibold text-amber-900">
                  {t("chart.researchTitle")}
                </p>
                {personGaps.slice(0, 3).map((g) => (
                  <div
                    key={g.kind}
                    className="flex items-center gap-1 px-1 text-[10px] text-amber-950"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {t(`detail.gap.${g.kind}`)}
                    </span>
                    {gapsCtx?.canWrite && gapsCtx.onFixGap && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-5 px-1.5 text-[10px]"
                        onClick={() => gapsCtx.onFixGap?.(person, g.kind)}
                      >
                        {t("tree.growthFix")}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
      {onQuickAdd && !compact && (
        <QuickAddMenu
          compact
          onPick={(kinship) => onQuickAdd(person, kinship)}
        />
      )}
    </div>
  );
}

function ChildrenRow({
  kidIds,
  depth,
  byId,
  childrenOf,
  spousesOf,
  rels,
  ranks,
  onPersonClick,
  compact,
  visited,
  remoteByLocal,
  L,
  t,
}: {
  kidIds: number[];
  depth: number;
  byId: Map<number, Person>;
  childrenOf: Map<number, number[]>;
  spousesOf: Map<number, number[]>;
  rels: Relationship[];
  ranks: Map<number, ReturnType<typeof computePersonRanks>>;
  onPersonClick?: (person: Person) => void;
  compact?: boolean;
  visited: Set<number>;
  remoteByLocal: Map<number, RemotePerson[]>;
  L: Labels;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  if (kidIds.length === 0) return null;
  const sorted = [...kidIds].sort((a, b) => {
    const pa = byId.get(a)!;
    const pb = byId.get(b)!;
    return comparePeopleByBirth(pa, pb);
  });

  return (
    <div className="w-full max-w-none">
      <SiblingFork childCount={sorted.length}>
        {sorted.map((kidId) => (
          <BranchColumn key={kidId}>
            <CoupleNode
              focusId={kidId}
              depth={depth + 1}
              byId={byId}
              childrenOf={childrenOf}
              spousesOf={spousesOf}
              rels={rels}
              ranks={ranks}
              onPersonClick={onPersonClick}
              compact={compact}
              visited={visited}
              remoteByLocal={remoteByLocal}
              L={L}
              t={t}
            />
          </BranchColumn>
        ))}
      </SiblingFork>
    </div>
  );
}

/**
 * صف الزوجية متمركز على الشخص المحوري.
 * عند وجود زوجين على الجانبين: عمودان متساويان ليبقى المحور تحت خط الإخوة.
 * عند وجود زوج على جانب واحد فقط: لا نحجز مساحة فارغة معاكسة (كانت تباعد فروع الزوجات).
 */
function SiblingHub({
  hub,
  startSide,
  endSide,
}: {
  hub: ReactNode;
  /** جهة inline-start (يمين في RTL) */
  startSide?: ReactNode;
  /** جهة inline-end (يسار في RTL) */
  endSide?: ReactNode;
}) {
  const hasStart = startSide != null;
  const hasEnd = endSide != null;

  if (hasStart && hasEnd) {
    return (
      <div
        className="mx-auto grid w-max max-w-none grid-cols-[1fr_auto_1fr] items-center"
        dir="rtl"
      >
        <div className="flex items-center justify-end">{startSide}</div>
        <div className="relative z-[1] shrink-0">{hub}</div>
        <div className="flex items-center justify-start">{endSide}</div>
      </div>
    );
  }

  if (hasStart) {
    return (
      <div className="mx-auto flex w-max max-w-none items-center" dir="rtl">
        <div className="flex items-center">{startSide}</div>
        <div className="relative z-[1] shrink-0">{hub}</div>
      </div>
    );
  }

  if (hasEnd) {
    return (
      <div className="mx-auto flex w-max max-w-none items-center" dir="rtl">
        <div className="relative z-[1] shrink-0">{hub}</div>
        <div className="flex items-center">{endSide}</div>
      </div>
    );
  }

  return <div className="relative z-[1] mx-auto w-max shrink-0">{hub}</div>;
}

/** غلاف الأبناء — عرض طبيعي حتى لا تتداخل الفروع */
function DescendantsOverflow({ children }: { children: ReactNode }) {
  return <div className="flex w-max max-w-none justify-center">{children}</div>;
}

/** بطاقات الزوج/الزوجة متمركزة على الشخص المحوري (focus) */
function FocusCoupleStrip({
  focus,
  spouses,
  depth,
  ranks,
  onPersonClick,
  compact,
  rels,
  externalSpouses,
  L,
  t,
  activeSpouseId = null,
}: {
  focus: Person;
  spouses: Person[];
  depth: number;
  ranks: Map<number, ReturnType<typeof computePersonRanks>>;
  onPersonClick?: (person: Person) => void;
  compact?: boolean;
  rels: Relationship[];
  externalSpouses: RemotePerson[];
  L: Labels;
  t: (k: string, o?: Record<string, unknown>) => string;
  /** عند التصفية: إبراز زوج/ة واحدة وتعتيم الباقي */
  activeSpouseId?: number | null;
}) {
  const chartActions = useContext(ChartActionsContext);
  const ordered = sortSpouses(spouses, rels, focus.id);
  const startSpouses = ordered.filter((_, i) => i % 2 === 0);
  const endSpouses = ordered.filter((_, i) => i % 2 === 1);

  const renderSpouseChain = (list: Person[], towardStart: boolean) => {
    const nodes: ReactNode[] = [];
    list.forEach((sp) => {
      const spouseRel = findSpouseRel(rels, focus.id, sp.id);
      const dates = formatSpouseDates(spouseRel, t);
      const dimmed =
        activeSpouseId != null && activeSpouseId !== sp.id;
      const link = (
        <CoupleLink
          key={`l-${sp.id}`}
          marriageLabel={dates.marriage}
          divorceLabel={dates.divorce}
          minWidth={48}
          editTitle={chartActions?.editSpouseTitle}
          onClick={
            chartActions?.onEditSpouse && spouseRel
              ? () => chartActions.onEditSpouse!(spouseRel, focus, sp)
              : undefined
          }
        />
      );
      const card = (
        <div
          key={`c-${sp.id}`}
          className={cn(dimmed && "opacity-35 grayscale-[30%]")}
        >
          <PersonCard
            person={sp}
            depth={depth}
            compact={compact}
            ranks={ranks.get(sp.id)}
            onPersonClick={onPersonClick}
            L={L}
            t={t}
          />
        </div>
      );
      if (towardStart) {
        nodes.push(card, link);
      } else {
        nodes.push(link, card);
      }
    });
    return nodes;
  };

  const extStart = externalSpouses.slice(0, Math.ceil(externalSpouses.length / 2));
  const extEnd = externalSpouses.slice(Math.ceil(externalSpouses.length / 2));

  return (
    <SiblingHub
      hub={
        <PersonCard
          person={focus}
          depth={depth}
          compact={compact}
          ranks={ranks.get(focus.id)}
          onPersonClick={onPersonClick}
          L={L}
          t={t}
        />
      }
      startSide={
        startSpouses.length > 0 || extStart.length > 0 ? (
          <>
            {renderSpouseChain(startSpouses, true)}
            {extStart.map((ep) => (
              <span key={ep.linkId} className="flex items-center">
                <ExternalSpouseCard person={ep} compact={compact} t={t} />
                <CoupleLink minWidth={40} />
              </span>
            ))}
          </>
        ) : undefined
      }
      endSide={
        endSpouses.length > 0 || extEnd.length > 0 ? (
          <>
            {extEnd.map((ep) => (
              <span key={ep.linkId} className="flex items-center">
                <CoupleLink minWidth={40} />
                <ExternalSpouseCard person={ep} compact={compact} t={t} />
              </span>
            ))}
            {renderSpouseChain(endSpouses, false)}
          </>
        ) : undefined
      }
    />
  );
}

/** بطاقات الزوج/الزوجة + الروابط الخارجية بجانب الشخص */
function CoupleCardsRow({
  couple,
  depth,
  ranks,
  onPersonClick,
  compact,
  spouseDates,
  externalSpouses,
  L,
  t,
  focusId,
  rels,
}: {
  couple: Person[];
  depth: number;
  ranks: Map<number, ReturnType<typeof computePersonRanks>>;
  onPersonClick?: (person: Person) => void;
  compact?: boolean;
  spouseDates: { marriage?: string; divorce?: string };
  externalSpouses: RemotePerson[];
  L: Labels;
  t: (k: string, o?: Record<string, unknown>) => string;
  focusId?: number;
  rels: Relationship[];
}) {
  const chartActions = useContext(ChartActionsContext);
  const focus = focusId
    ? couple.find((p) => p.id === focusId) ?? couple[0]
    : couple[0];
  if (!focus) return null;
  const spouses = couple.filter((p) => p.id !== focus.id);

  if (spouses.length === 0 && externalSpouses.length === 0) {
    return (
      <PersonCard
        person={focus}
        depth={depth}
        compact={compact}
        ranks={ranks.get(focus.id)}
        onPersonClick={onPersonClick}
        L={L}
        t={t}
      />
    );
  }

  if (spouses.length === 1 && externalSpouses.length === 0) {
    const sp = spouses[0]!;
    const spouseRel = findSpouseRel(rels, focus.id, sp.id);
    return (
      <SiblingHub
        hub={
          <PersonCard
            person={focus}
            depth={depth}
            compact={compact}
            ranks={ranks.get(focus.id)}
            onPersonClick={onPersonClick}
            L={L}
            t={t}
          />
        }
        startSide={
          <>
            <PersonCard
              person={sp}
              depth={depth}
              compact={compact}
              ranks={ranks.get(sp.id)}
              onPersonClick={onPersonClick}
              L={L}
              t={t}
            />
            <CoupleLink
              marriageLabel={spouseDates.marriage}
              divorceLabel={spouseDates.divorce}
              minWidth={48}
              editTitle={chartActions?.editSpouseTitle}
              onClick={
                chartActions?.onEditSpouse && spouseRel
                  ? () => chartActions.onEditSpouse!(spouseRel, focus, sp)
                  : undefined
              }
            />
          </>
        }
      />
    );
  }

  return (
    <FocusCoupleStrip
      focus={focus}
      spouses={spouses}
      depth={depth}
      ranks={ranks}
      onPersonClick={onPersonClick}
      compact={compact}
      rels={rels}
      externalSpouses={externalSpouses}
      L={L}
      t={t}
    />
  );
}

/** عائلة متعددة الزيجات مع فلتر «كل الزيجات / زوجة محددة» */
function MultiSpouseBranch({
  focus,
  spouses,
  spouseKids,
  orphanKids,
  depth,
  byId,
  childrenOf,
  spousesOf,
  rels,
  ranks,
  onPersonClick,
  compact,
  visited,
  remoteByLocal,
  externalSpouses,
  L,
  t,
}: {
  focus: Person;
  spouses: Person[];
  spouseKids: Array<{ spouse: Person; kids: number[] }>;
  orphanKids: number[];
  depth: number;
  byId: Map<number, Person>;
  childrenOf: Map<number, number[]>;
  spousesOf: Map<number, number[]>;
  rels: Relationship[];
  ranks: Map<number, ReturnType<typeof computePersonRanks>>;
  onPersonClick?: (person: Person) => void;
  compact?: boolean;
  visited: Set<number>;
  remoteByLocal: Map<number, RemotePerson[]>;
  externalSpouses: RemotePerson[];
  L: Labels;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const [activeSpouseId, setActiveSpouseId] = useState<number | "all">("all");
  const visible =
    activeSpouseId === "all"
      ? spouseKids
      : spouseKids.filter((s) => s.spouse.id === activeSpouseId);
  const showOrphans = activeSpouseId === "all" && orphanKids.length > 0;

  return (
    <div className="flex flex-col items-center shrink-0">
      <FocusCoupleStrip
        focus={focus}
        spouses={spouses}
        depth={depth}
        ranks={ranks}
        onPersonClick={onPersonClick}
        compact={compact}
        rels={rels}
        externalSpouses={externalSpouses}
        L={L}
        t={t}
        activeSpouseId={activeSpouseId === "all" ? null : activeSpouseId}
      />
      {!compact && (
      <div
        className="mt-1.5 mb-0.5 flex flex-wrap items-center justify-center gap-1 print:hidden"
        data-no-pan
      >
        <button
          type="button"
          data-no-pan
          onClick={() => setActiveSpouseId("all")}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition",
            activeSpouseId === "all"
              ? "border-sky-500 bg-sky-50 text-sky-800"
              : "border-stone-300 bg-white text-stone-600 hover:border-sky-300",
          )}
        >
          {t("chart.allMarriages")}
        </button>
        {spouses.map((sp) => (
          <button
            key={sp.id}
            type="button"
            data-no-pan
            onClick={() => setActiveSpouseId(sp.id)}
            className={cn(
              "max-w-[6.5rem] truncate rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition",
              activeSpouseId === sp.id
                ? "border-amber-500 bg-amber-50 text-amber-900"
                : "border-stone-300 bg-white text-stone-600 hover:border-amber-300",
            )}
            title={sp.givenName}
          >
            {sp.givenName}
          </button>
        ))}
      </div>
      )}
      <DescendantsOverflow>
        {/* كل زيجة تحت الأخرى — يمنع التمدد الأفقي الهائل بين فرعي الزوجات */}
        <div
          className={cn(
            "flex items-center pt-1",
            activeSpouseId === "all" && visible.filter((v) => v.kids.length > 0).length + (showOrphans ? 1 : 0) > 1
              ? "flex-col gap-5"
              : "flex-nowrap justify-center gap-4",
          )}
          dir="rtl"
        >
          {visible.map(({ spouse, kids }) =>
            kids.length > 0 ? (
              <div key={spouse.id} className="flex flex-col items-center">
                {activeSpouseId === "all" && (
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-px w-6 bg-stone-300" aria-hidden />
                    <p className="max-w-[8rem] truncate text-center text-[10px] font-medium text-stone-600">
                      {t("chart.motherBranch", { name: spouse.givenName })}
                    </p>
                    <span className="h-px w-6 bg-stone-300" aria-hidden />
                  </div>
                )}
                <ChildrenRow
                  kidIds={kids}
                  depth={depth}
                  byId={byId}
                  childrenOf={childrenOf}
                  spousesOf={spousesOf}
                  rels={rels}
                  ranks={ranks}
                  onPersonClick={onPersonClick}
                  compact={compact}
                  visited={visited}
                  remoteByLocal={remoteByLocal}
                  L={L}
                  t={t}
                />
              </div>
            ) : null,
          )}
          {showOrphans && (
            <div className="flex flex-col items-center">
              <p className="mb-0.5 px-1 text-center text-[9px] text-muted-foreground">
                {t("chart.noMotherListed")}
              </p>
              <ChildrenRow
                kidIds={orphanKids}
                depth={depth}
                byId={byId}
                childrenOf={childrenOf}
                spousesOf={spousesOf}
                rels={rels}
                ranks={ranks}
                onPersonClick={onPersonClick}
                compact={compact}
                visited={visited}
                remoteByLocal={remoteByLocal}
                L={L}
                t={t}
              />
            </div>
          )}
        </div>
      </DescendantsOverflow>
    </div>
  );
}

function CoupleNode({
  focusId,
  depth,
  byId,
  childrenOf,
  spousesOf,
  rels,
  ranks,
  onPersonClick,
  compact,
  visited,
  remoteByLocal,
  L,
  t,
}: {
  focusId: number;
  depth: number;
  byId: Map<number, Person>;
  childrenOf: Map<number, number[]>;
  spousesOf: Map<number, number[]>;
  rels: Relationship[];
  ranks: Map<number, ReturnType<typeof computePersonRanks>>;
  onPersonClick?: (person: Person) => void;
  compact?: boolean;
  visited: Set<number>;
  remoteByLocal: Map<number, RemotePerson[]>;
  L: Labels;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const printLevels = useContext(PrintLevelsContext);
  const focus = byId.get(focusId);
  if (!focus) return null;

  // ظهر سابقاً (مثلاً كزوج تحت عائلة أخرى) — أعد عرضه مع زوجه دون تكرار الأبناء
  const mirrorOnly = visited.has(focusId);

  const nextVisited = new Set(visited);
  nextVisited.add(focusId);

  const externalSpouses = remoteByLocal.get(focusId) ?? [];

  // دائماً أظهر الأزواج حتى لو ظهروا سابقاً في فرع آخر (انعكاس الزواج بين العائلتين)
  const oppositeSpouses = (spousesOf.get(focusId) ?? [])
    .map((id) => byId.get(id))
    .filter((p): p is Person => !!p && p.gender !== focus.gender);

  for (const s of oppositeSpouses) nextVisited.add(s.id);

  const coupleSorted = [focus, ...oppositeSpouses].sort((a, b) => {
    if (a.gender === b.gender) return 0;
    return isFemale(a.gender) ? 1 : -1;
  });
  const fatherCard = coupleSorted.find((p) => !isFemale(p.gender)) ?? null;
  const motherCard = coupleSorted.find((p) => isFemale(p.gender)) ?? null;
  const primarySpouseRel =
    fatherCard && motherCard
      ? findSpouseRel(rels, fatherCard.id, motherCard.id)
      : oppositeSpouses[0]
        ? findSpouseRel(rels, focus.id, oppositeSpouses[0].id)
        : undefined;
  const primarySpouseDates = formatSpouseDates(primarySpouseRel, t);

  if (mirrorOnly) {
    return (
      <div className="flex flex-col items-center shrink-0">
        <CoupleCardsRow
          couple={coupleSorted}
          focusId={focus.id}
          rels={rels}
          depth={depth}
          ranks={ranks}
          onPersonClick={onPersonClick}
          compact={compact}
          spouseDates={primarySpouseDates}
          externalSpouses={externalSpouses}
          L={L}
          t={t}
        />
        <p className="mt-1 text-[8px] text-violet-600/90">{t("chart.spouseMirror")}</p>
      </div>
    );
  }

  // ذكر بعدة زوجات: المحور = الزوج (يثبت خط الإخوة)، الزوجات حوله، الأبناء تحته بلا توسيع العمود
  if (!isFemale(focus.gender) && oppositeSpouses.length > 1) {
    const orderedWives = sortSpouses(oppositeSpouses, rels, focus.id);
    const orphanKids = childrenWithFatherOnly(
      focus.id,
      oppositeSpouses,
      childrenOf,
      rels,
      byId,
    );
    const wifeKids = orderedWives.map((wife) => ({
      wife,
      kids: childrenOfPair(focus.id, wife.id, childrenOf, rels, byId, true),
    }));

    return (
      <MultiSpouseBranch
        focus={focus}
        spouses={orderedWives}
        spouseKids={wifeKids.map(({ wife, kids }) => ({
          spouse: wife,
          kids,
        }))}
        orphanKids={orphanKids}
        depth={depth}
        byId={byId}
        childrenOf={childrenOf}
        spousesOf={spousesOf}
        rels={rels}
        ranks={ranks}
        onPersonClick={onPersonClick}
        compact={compact}
        visited={nextVisited}
        remoteByLocal={remoteByLocal}
        externalSpouses={externalSpouses}
        L={L}
        t={t}
      />
    );
  }

  // أنثى بعدة أزواج
  if (isFemale(focus.gender) && oppositeSpouses.length > 1) {
    const orderedHusbands = sortSpouses(oppositeSpouses, rels, focus.id);
    const husbandKids = orderedHusbands.map((husband) => ({
      husband,
      kids: childrenOfPair(husband.id, focus.id, childrenOf, rels, byId, true),
    }));

    return (
      <MultiSpouseBranch
        focus={focus}
        spouses={orderedHusbands}
        spouseKids={husbandKids.map(({ husband, kids }) => ({
          spouse: husband,
          kids,
        }))}
        orphanKids={[]}
        depth={depth}
        byId={byId}
        childrenOf={childrenOf}
        spousesOf={spousesOf}
        rels={rels}
        ranks={ranks}
        onPersonClick={onPersonClick}
        compact={compact}
        visited={nextVisited}
        remoteByLocal={remoteByLocal}
        externalSpouses={externalSpouses}
        L={L}
        t={t}
      />
    );
  }

  const couple = [focus, ...oppositeSpouses].sort((a, b) => {
    if (a.gender === b.gender) return 0;
    return isFemale(a.gender) ? 1 : -1;
  });

  const father = couple.find((p) => !isFemale(p.gender)) ?? null;
  const mother = couple.find((p) => isFemale(p.gender)) ?? null;

  const displayKids = childrenOfPair(
    father?.id ?? null,
    mother?.id ?? null,
    childrenOf,
    rels,
    byId,
    false,
  )
    .filter((kidId) => {
      if (!printLevels) return true;
      // الطباعة: الأبناء عند الأب إن وُجد في الشجرة، وإلا عند الأم (focus إن كانت الأم)
      return preferredParentId(kidId, rels, byId) === focus.id;
    })
    .sort((a, b) => comparePeopleByBirth(byId.get(a)!, byId.get(b)!));

  const spouseRel =
    father && mother ? findSpouseRel(rels, father.id, mother.id) : undefined;
  const spouseDates = formatSpouseDates(spouseRel, t);

  return (
    <div className="flex flex-col items-center shrink-0">
      <CoupleCardsRow
        couple={couple}
        focusId={focus.id}
        rels={rels}
        depth={depth}
        ranks={ranks}
        onPersonClick={onPersonClick}
        compact={compact}
        spouseDates={spouseDates}
        externalSpouses={externalSpouses}
        L={L}
        t={t}
      />

      {displayKids.length > 0 && (
        <DescendantsOverflow>
          <ChildrenRow
            kidIds={displayKids}
            depth={depth}
            byId={byId}
            childrenOf={childrenOf}
            spousesOf={spousesOf}
            rels={rels}
            ranks={ranks}
            onPersonClick={onPersonClick}
            compact={compact}
            visited={nextVisited}
            remoteByLocal={remoteByLocal}
            L={L}
            t={t}
          />
        </DescendantsOverflow>
      )}
    </div>
  );
}