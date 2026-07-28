import { useEffect, useMemo, useRef, useState } from "react";
import type { Person, Relationship } from "@db/schema";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import { useLabels } from "@/lib/labels";
import type { PersonPrivacy } from "@contracts/constants";
import {
  buildSpousesOf,
  findUnlinkedPersonIds,
  getParents,
  oppositeSpouses,
} from "@/lib/familyGraph";
import PersonSearchPicker from "@/components/tree/PersonSearchPicker";
import { parseLineageChain } from "@/lib/lineageParser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, X, Users2 } from "lucide-react";
import {
  getTwinGroupMembers,
  isTwin,
  twinCandidateSiblings,
  fullSiblingsOf,
  twinGroupSize,
  twinOrderInGroup,
} from "@/lib/twins";
import TwinBadge from "@/components/tree/TwinBadge";

type Kinship =
  | "father"
  | "mother"
  | "brother"
  | "sister"
  | "spouse"
  | "son"
  | "daughter";

type Props = {
  treeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person?: Person | null;
  people: Person[];
  rels: Relationship[];
  defaultAnchorId?: number | null;
  /** صلة افتراضية عند الإضافة (أب/أم/ابن…) */
  defaultKinship?: Kinship | null;
  /** إضافة كتوأم لهذا الشخص */
  defaultTwinOfId?: number | null;
  onAdded?: () => void;
};

const KINSHIPS: Kinship[] = [
  "father",
  "mother",
  "brother",
  "sister",
  "spouse",
  "son",
  "daughter",
];

const LAST_ANCHOR_KEY = "nasab:lastAnchorId";

function pickPreferredAnchor(
  people: Person[],
  defaultAnchorId?: number | null,
): string {
  if (defaultAnchorId && people.some((p) => p.id === defaultAnchorId)) {
    return String(defaultAnchorId);
  }
  try {
    const saved = localStorage.getItem(LAST_ANCHOR_KEY);
    if (saved && people.some((p) => String(p.id) === saved)) {
      return saved;
    }
  } catch {
    /* ignore */
  }
  if (people.length === 1) return String(people[0].id);
  if (people.length > 1) {
    const males = people.filter((p) => p.gender === "male");
    return String((males.at(-1) ?? people.at(-1))!.id);
  }
  return "";
}

function buildLineage(
  anchor: Person,
  kinship: Kinship,
  otherParent?: Person | null,
  labels: { bin: string; bint: string } = { bin: "", bint: "" },
): string {
  if (kinship === "son" || kinship === "daughter") {
    const prefix = kinship === "daughter" ? labels.bint : labels.bin;
    if (anchor.gender === "female") {
      const father = otherParent;
      if (father) {
        if (father.fatherName?.trim()) {
          return `${prefix} ${father.givenName} ${father.fatherName.trim()}`;
        }
        return `${prefix} ${father.givenName}`;
      }
      return "";
    }
    if (anchor.fatherName?.trim()) {
      return `${prefix} ${anchor.givenName} ${anchor.fatherName.trim()}`;
    }
    return `${prefix} ${anchor.givenName}`;
  }
  if (kinship === "brother" || kinship === "sister") {
    return anchor.fatherName?.trim() ?? "";
  }
  return "";
}

function genderForKinship(
  kinship: Kinship,
  anchor: Person | null,
): "male" | "female" {
  if (kinship === "spouse" && anchor) {
    return anchor.gender === "male" ? "female" : "male";
  }
  if (
    kinship === "mother" ||
    kinship === "sister" ||
    kinship === "daughter"
  ) {
    return "female";
  }
  return "male";
}

function parseOptInt(v: string): number | null {
  if (!v.trim()) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

export default function PersonFormDialog({
  treeId,
  open,
  onOpenChange,
  person,
  people,
  rels,
  defaultAnchorId,
  defaultKinship = null,
  defaultTwinOfId = null,
  onAdded,
}: Props) {
  const isEdit = !!person;
  const mustLink = !isEdit && people.length > 0;
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const L = useLabels();
  const fileRef = useRef<HTMLInputElement>(null);

  const [givenName, setGivenName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [kunya, setKunya] = useState("");
  const [laqab, setLaqab] = useState("");
  const [clan, setClan] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [deathDay, setDeathDay] = useState("");
  const [deathMonth, setDeathMonth] = useState("");
  const [deathYear, setDeathYear] = useState("");
  const [deathPlace, setDeathPlace] = useState("");
  const [isLiving, setIsLiving] = useState(true);
  const [privacy, setPrivacy] = useState<PersonPrivacy>("family");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [linkPersonId, setLinkPersonId] = useState<string>("");
  const [kinship, setKinship] = useState<Kinship>("son");
  const [otherParentId, setOtherParentId] = useState<string>("");
  const [editMotherId, setEditMotherId] = useState<string>("");
  const [editFatherId, setEditFatherId] = useState<string>("");
  const [lineageTouched, setLineageTouched] = useState(false);
  const [linkExistingId, setLinkExistingId] = useState<number | null>(null);
  const [createBranchFromLineage, setCreateBranchFromLineage] = useState(false);
  const [isTwinMode, setIsTwinMode] = useState(false);
  const [twinOfId, setTwinOfId] = useState<string>("");
  const [clearTwinOnSave, setClearTwinOnSave] = useState(false);

  const byId = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );

  const spousesOf = useMemo(() => buildSpousesOf(rels), [rels]);

  const linkOptions = useMemo(
    () => people.filter((p) => p.id !== person?.id),
    [people, person],
  );

  const unlinkedIds = useMemo(
    () => findUnlinkedPersonIds(people, rels),
    [people, rels],
  );

  const anchor = useMemo(
    () => linkOptions.find((p) => p.id.toString() === linkPersonId) ?? null,
    [linkOptions, linkPersonId],
  );

  const isSiblingKinship = kinship === "brother" || kinship === "sister";
  const isChildKinship = kinship === "son" || kinship === "daughter";

  const otherParentOptions = useMemo(() => {
    if (!anchor || !isChildKinship) return [];
    return oppositeSpouses(anchor, spousesOf, byId);
  }, [anchor, isChildKinship, spousesOf, byId]);

  const otherParentRole = useMemo(() => {
    if (!anchor || !isChildKinship) return null;
    return anchor.gender === "male" ? "mother" : "father";
  }, [anchor, isChildKinship]);

  const selectedOtherParent = useMemo(() => {
    if (!otherParentId || otherParentId === "other") return null;
    return byId.get(parseInt(otherParentId, 10)) ?? null;
  }, [otherParentId, byId]);

  const twinPickerOptions = useMemo(() => {
    if (isEdit && person) {
      return twinCandidateSiblings(person, [], rels, people);
    }

    const dedupe = (list: Person[]) => {
      const seen = new Set<number>();
      return list.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
    };

    // توأم لشخص محدد مسبقاً
    if (twinOfId) {
      const ref = byId.get(parseInt(twinOfId, 10));
      if (!ref) return [];
      return dedupe([ref, ...fullSiblingsOf(ref, rels, people)]);
    }

    // إضافة كأخ/أخت → أشقاء المرجع فقط
    if (isSiblingKinship && anchor) {
      return dedupe([anchor, ...fullSiblingsOf(anchor, rels, people)]);
    }

    // إضافة كابن/بنت → أبناء نفس الأبوين (anchor + الأم/الأب الآخر)
    if (isChildKinship && anchor && selectedOtherParent) {
      const fatherId =
        anchor.gender === "male" ? anchor.id : selectedOtherParent.id;
      const motherId =
        anchor.gender === "female" ? anchor.id : selectedOtherParent.id;
      return people
        .filter((p) => {
          const parents = getParents(p.id, rels, byId);
          return parents.fatherId === fatherId && parents.motherId === motherId;
        })
        .sort((a, b) => a.givenName.localeCompare(b.givenName, "ar"));
    }

    return [];
  }, [
    isEdit,
    person,
    twinOfId,
    anchor,
    isSiblingKinship,
    isChildKinship,
    selectedOtherParent,
    rels,
    people,
    byId,
  ]);

  const selectedTwin = useMemo(() => {
    if (!twinOfId) return null;
    return byId.get(parseInt(twinOfId, 10)) ?? null;
  }, [twinOfId, byId]);

  const currentTwins = useMemo(() => {
    if (!isEdit || !person) return [];
    return getTwinGroupMembers(person, people);
  }, [isEdit, person, people]);

  const addingViaMother =
    !isEdit && isChildKinship && anchor?.gender === "female";
  const addingViaFather =
    !isEdit && isChildKinship && anchor?.gender === "male";

  const lineageSegments = useMemo(
    () => parseLineageChain(fatherName).segments.length,
    [fatherName],
  );

  const lineageSearch = trpc.person.searchLineage.useQuery(
    {
      treeId,
      givenName: givenName.trim(),
      fatherName: fatherName.trim() || undefined,
      excludeId: person?.id,
    },
    {
      enabled:
        open &&
        !isEdit &&
        givenName.trim().length >= 2 &&
        (kinship === "spouse" || kinship === "son" || kinship === "daughter"),
    },
  );

  const lineageMatches = lineageSearch.data ?? [];
  const highConfidenceMatch = lineageMatches.find((m) => m.score >= 100);

  const editFatherPerson = useMemo(() => {
    if (!editFatherId) return null;
    return byId.get(parseInt(editFatherId, 10)) ?? null;
  }, [editFatherId, byId]);

  const editMotherPerson = useMemo(() => {
    if (!editMotherId) return null;
    return byId.get(parseInt(editMotherId, 10)) ?? null;
  }, [editMotherId, byId]);

  /** زوجات الأب المختار فقط */
  const editMotherOptions = useMemo(() => {
    if (!isEdit || !editFatherPerson) return [];
    const spouses = oppositeSpouses(editFatherPerson, spousesOf, byId).filter(
      (p) => p.id !== person?.id,
    );
    const currentId = editMotherId ? parseInt(editMotherId, 10) : null;
    if (currentId && !spouses.some((p) => p.id === currentId)) {
      const current = byId.get(currentId);
      if (current?.gender === "female") return [...spouses, current];
    }
    return spouses;
  }, [isEdit, editFatherPerson, editMotherId, spousesOf, byId, person?.id]);

  /** أزواج الأم المختارة، أو كل الذكور إن لم تُحدَّد أم */
  const editFatherOptions = useMemo(() => {
    if (!isEdit) return [];
    if (editMotherPerson) {
      return oppositeSpouses(editMotherPerson, spousesOf, byId).filter(
        (p) => p.id !== person?.id,
      );
    }
    return people.filter((p) => p.gender === "male" && p.id !== person?.id);
  }, [isEdit, editMotherPerson, spousesOf, byId, people, person?.id]);

  useEffect(() => {
    if (!open) return;
    setGivenName(person?.givenName ?? "");
    setFatherName(person?.fatherName ?? "");
    setKunya(person?.kunya ?? "");
    setLaqab(person?.laqab ?? "");
    setClan(person?.clan ?? "");
    setGender(person?.gender ?? "male");
    setBirthDay(person?.birthDay?.toString() ?? "");
    setBirthMonth(person?.birthMonth?.toString() ?? "");
    setBirthYear(person?.birthYear?.toString() ?? "");
    setBirthPlace(person?.birthPlace ?? "");
    setDeathDay(person?.deathDay?.toString() ?? "");
    setDeathMonth(person?.deathMonth?.toString() ?? "");
    setDeathYear(person?.deathYear?.toString() ?? "");
    setDeathPlace(person?.deathPlace ?? "");
    setIsLiving(
      person
        ? person.isLiving === true || (person.isLiving as unknown) === 1
        : true,
    );
    setPrivacy((person?.privacy as PersonPrivacy) ?? "family");
    setNotes(person?.notes ?? "");
    setPhotoUrl(person?.photoUrl ?? null);
    setLineageTouched(false);
    setOtherParentId("");
    setLinkExistingId(null);
    setCreateBranchFromLineage(false);
    setIsTwinMode(false);
    setTwinOfId("");
    setClearTwinOnSave(false);

    if (isEdit && person) {
      const { fatherId, motherId } = getParents(person.id, rels, byId);
      setEditFatherId(fatherId ? String(fatherId) : "");
      setEditMotherId(motherId ? String(motherId) : "");
      setLinkPersonId("");
      const twins = getTwinGroupMembers(person, people);
      setIsTwinMode(isTwin(person));
      setTwinOfId(twins[0] ? String(twins[0].id) : "");
      return;
    }

    setEditFatherId("");
    setEditMotherId("");
    setLinkPersonId(pickPreferredAnchor(people, defaultTwinOfId ?? defaultAnchorId));
    const twinKinship =
      defaultTwinOfId != null
        ? (byId.get(defaultTwinOfId)?.gender === "female" ? "sister" : "brother")
        : defaultKinship && KINSHIPS.includes(defaultKinship)
          ? defaultKinship
          : "son";
    setKinship(twinKinship);
    if (defaultTwinOfId != null) {
      setIsTwinMode(true);
      setTwinOfId(String(defaultTwinOfId));
      const twinRef = byId.get(defaultTwinOfId);
      if (twinRef) {
        setBirthDay(twinRef.birthDay?.toString() ?? "");
        setBirthMonth(twinRef.birthMonth?.toString() ?? "");
        setBirthYear(twinRef.birthYear?.toString() ?? "");
        setBirthPlace(twinRef.birthPlace ?? "");
      }
    }
    // لا تُضَمَّن people/rels — وإلا يُمسَح النموذج عند كل تحديث للشجرة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, person?.id, defaultAnchorId, defaultKinship, defaultTwinOfId, isEdit]);

  /** إذا فُتح الحوار قبل تحميل الأشخاص */
  useEffect(() => {
    if (!open || isEdit || linkPersonId) return;
    const preferred = pickPreferredAnchor(people, defaultAnchorId);
    if (preferred) setLinkPersonId(preferred);
  }, [open, isEdit, linkPersonId, people, defaultAnchorId]);

  useEffect(() => {
    if (isEdit || !isChildKinship || !addingViaMother) return;
    if (otherParentOptions.length === 0 && !otherParentId) {
      setOtherParentId("other");
    }
  }, [isEdit, isChildKinship, addingViaMother, otherParentOptions.length, otherParentId]);

  useEffect(() => {
    if (isEdit || !isChildKinship) return;
    if (otherParentOptions.length === 1) {
      if (!otherParentId) {
        setOtherParentId(String(otherParentOptions[0].id));
      }
    } else if (
      otherParentId &&
      otherParentId !== "other" &&
      !otherParentOptions.some((p) => String(p.id) === otherParentId)
    ) {
      setOtherParentId("");
    }
  }, [isEdit, isChildKinship, otherParentOptions, otherParentId]);

  useEffect(() => {
    if (!open || isEdit) return;
    if (isTwinMode && isSiblingKinship && linkPersonId && !twinOfId) {
      setTwinOfId(linkPersonId);
    }
  }, [open, isEdit, isTwinMode, isSiblingKinship, linkPersonId, twinOfId]);

  useEffect(() => {
    if (!selectedTwin || isEdit) return;
    setBirthDay(selectedTwin.birthDay?.toString() ?? "");
    setBirthMonth(selectedTwin.birthMonth?.toString() ?? "");
    setBirthYear(selectedTwin.birthYear?.toString() ?? "");
    if (selectedTwin.birthPlace && !birthPlace) {
      setBirthPlace(selectedTwin.birthPlace);
    }
  }, [selectedTwin?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEdit || !editFatherPerson) return;
    if (
      editMotherId &&
      editMotherOptions.length > 0 &&
      !editMotherOptions.some((p) => String(p.id) === editMotherId)
    ) {
      setEditMotherId("");
    }
  }, [isEdit, editFatherPerson, editMotherId, editMotherOptions]);

  useEffect(() => {
    if (!isEdit || !editMotherPerson) return;
    if (
      editFatherId &&
      editFatherOptions.length > 0 &&
      !editFatherOptions.some((p) => String(p.id) === editFatherId)
    ) {
      setEditFatherId("");
    }
  }, [isEdit, editMotherPerson, editFatherId, editFatherOptions]);

  // تعبئة الجنس والنسب واللقب/الفخذ من المربوط — دائماً عند تغيّر الصلة أو الشخص
  useEffect(() => {
    if (isEdit || !anchor || !kinship) return;

    setGender(genderForKinship(kinship, anchor));

    if (!lineageTouched) {
      const lineageLabels = {
        bin: t("personForm.bin"),
        bint: t("personForm.bint"),
      };
      if (addingViaMother) {
        if (otherParentId === "other") {
          /* يُترك للمستخدم */
        } else {
          const father =
            selectedOtherParent ?? otherParentOptions[0] ?? null;
          setFatherName(buildLineage(anchor, kinship, father, lineageLabels));
        }
      } else {
        setFatherName(buildLineage(anchor, kinship, null, lineageLabels));
      }
    }

    // ورّث القبيلة/اللقب من الأب عند إضافة ابن/بنت/أخ/أخت
    if (
      kinship === "son" ||
      kinship === "daughter" ||
      kinship === "brother" ||
      kinship === "sister"
    ) {
      if (anchor.clan && !clan) setClan(anchor.clan);
      if (anchor.laqab && !laqab) setLaqab(anchor.laqab);
    }
  }, [anchor, kinship, isEdit, lineageTouched, addingViaMother, otherParentId, selectedOtherParent, otherParentOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSuccess = (msg: string) => {
    toast.success(msg);
    if (linkPersonId) {
      try {
        localStorage.setItem(LAST_ANCHOR_KEY, linkPersonId);
      } catch {
        /* ignore */
      }
    }
    onOpenChange(false);
    onAdded?.();
    void utils.person.list.invalidate({ treeId });
    void utils.tree.listMine.invalidate();
  };

  const createMut = trpc.person.create.useMutation({
    onSuccess: () => onSuccess(t("personForm.added")),
    onError: (e) => toast.error(e.message),
  });
  const updateMut = trpc.person.update.useMutation({
    onSuccess: () => onSuccess(t("personForm.updated")),
    onError: (e) => toast.error(e.message),
  });

  const pending = createMut.isPending || updateMut.isPending;

  const onPickPhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("personForm.photoInvalid"));
      return;
    }
    if (file.size > 400_000) {
      toast.error(t("personForm.photoTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPhotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const base = {
      givenName: givenName.trim(),
      fatherName: fatherName.trim() || null,
      kunya: kunya.trim() || null,
      laqab: laqab.trim() || null,
      clan: clan.trim() || null,
      gender,
      birthDay: parseOptInt(birthDay),
      birthMonth: parseOptInt(birthMonth),
      birthYear: parseOptInt(birthYear),
      birthPlace: birthPlace.trim() || null,
      deathDay: isLiving ? null : parseOptInt(deathDay),
      deathMonth: isLiving ? null : parseOptInt(deathMonth),
      deathYear: isLiving ? null : parseOptInt(deathYear),
      deathPlace: isLiving ? null : deathPlace.trim() || null,
      isLiving: Boolean(isLiving),
      privacy,
      photoUrl,
      notes: notes.trim() || null,
    };
    if (!base.givenName) {
      toast.error(t("personForm.nameRequired"));
      return;
    }
    if (isEdit && person) {
      const motherIdNum = editMotherId ? parseInt(editMotherId, 10) : null;
      const fatherIdNum = editFatherId ? parseInt(editFatherId, 10) : null;
      const twinPayload =
        clearTwinOnSave || (!isTwinMode && isTwin(person))
          ? { twinOfPersonId: null as number | null }
          : isTwinMode && twinOfId
            ? { twinOfPersonId: parseInt(twinOfId, 10) }
            : {};
      updateMut.mutate({
        id: person.id,
        treeId,
        ...base,
        motherId:
          motherIdNum != null && Number.isFinite(motherIdNum)
            ? motherIdNum
            : null,
        fatherId:
          fatherIdNum != null && Number.isFinite(fatherIdNum)
            ? fatherIdNum
            : null,
        ...twinPayload,
      });
      return;
    }
    if (mustLink) {
      if (!linkPersonId) {
        toast.error(t("personForm.linkRequired"));
        return;
      }
      if (!kinship) {
        toast.error(t("personForm.kinshipRequired"));
        return;
      }
      if (
        isChildKinship &&
        otherParentOptions.length > 1 &&
        !otherParentId
      ) {
        toast.error(
          otherParentRole === "mother" || addingViaFather
            ? t("personForm.motherRequired")
            : t("personForm.fatherRequired"),
        );
        return;
      }
      if (
        addingViaMother &&
        (otherParentId === "other" || otherParentOptions.length === 0) &&
        !fatherName.trim()
      ) {
        toast.error(t("personForm.fatherLineageRequired"));
        return;
      }
    }
    if (isTwinMode && !twinOfId) {
      toast.error(t("twins.pickRequired"));
      return;
    }
    createMut.mutate({
      treeId,
      ...base,
      twinOfPersonId:
        isTwinMode && twinOfId ? parseInt(twinOfId, 10) : undefined,
      linkExistingId: linkExistingId ?? undefined,
      createBranchFromLineage:
        !linkExistingId && createBranchFromLineage && lineageSegments > 0
          ? true
          : undefined,
      link:
        linkPersonId && kinship
          ? {
              personId: parseInt(linkPersonId, 10),
              kinship,
              otherParentId: (() => {
                if (
                  otherParentId &&
                  otherParentId !== "other" &&
                  otherParentId !== "unnamed"
                ) {
                  return parseInt(otherParentId, 10);
                }
                if (
                  isChildKinship &&
                  otherParentOptions.length === 1
                ) {
                  return otherParentOptions[0].id;
                }
                return undefined;
              })(),
              createUnnamedMother:
                addingViaFather && otherParentId === "unnamed"
                  ? true
                  : undefined,
            }
          : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl max-h-[min(92vh,900px)] overflow-y-auto p-0 gap-0 w-[calc(100%-1rem)] sm:w-full">
        <DialogHeader className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 sm:px-6 pt-5 sm:pt-6 pb-4 text-start pe-12">
          <DialogTitle className="font-display text-xl sm:text-2xl">
            {isEdit
              ? t("personForm.editTitle", { name: person?.givenName })
              : t("personForm.addTitle")}
          </DialogTitle>
          {mustLink && (
            <DialogDescription className="text-sm leading-relaxed">
              {t("personForm.linkRequiredHint")}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 px-4 sm:px-6 py-5">
          {!isEdit && mustLink && (
            <div className="md:col-span-2 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:p-5 space-y-4">
              <p className="font-semibold text-base">{t("personForm.linkTitle")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{t("personForm.linkPick")} *</Label>
                  <PersonSearchPicker
                    people={linkOptions}
                    value={linkPersonId}
                    onChange={(v) => {
                      setLineageTouched(false);
                      setLinkPersonId(v);
                      setOtherParentId("");
                    }}
                    unlinkedIds={unlinkedIds}
                    placeholder={t("personForm.linkPick")}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t("personForm.kinship")} *</Label>
                  <Select
                    value={kinship}
                    onValueChange={(v) => {
                      setLineageTouched(false);
                      setKinship(v as Kinship);
                      setOtherParentId("");
                    }}
                    disabled={!linkPersonId}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t("personForm.kinshipPh")} />
                    </SelectTrigger>
                    <SelectContent>
                      {KINSHIPS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`personForm.kinships.${k}`)}
                          {anchor
                            ? ` ${t("common.emDash")} ${anchor.givenName}`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {anchor && kinship && (
                <p className="text-sm text-muted-foreground">
                  {t("personForm.kinshipPreview", {
                    kinship: t(`personForm.kinships.${kinship}`),
                    name: anchor.givenName,
                  })}
                </p>
              )}
              {!isEdit && isChildKinship && (addingViaMother || addingViaFather || otherParentOptions.length > 0) && (
                <div className="space-y-2">
                  <Label className="text-sm">
                    {otherParentRole === "mother" || addingViaFather
                      ? t("personForm.pickMother")
                      : t("personForm.pickFather")}
                    {(otherParentOptions.length > 1 || addingViaMother || addingViaFather) ? " *" : ""}
                  </Label>
                  <Select
                    value={otherParentId}
                    onValueChange={(v) => {
                      setLineageTouched(false);
                      setOtherParentId(v);
                      if (v === "other") {
                        setFatherName("");
                      }
                    }}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue
                        placeholder={
                          otherParentRole === "mother" || addingViaFather
                            ? t("personForm.pickMotherPh")
                            : t("personForm.pickFatherPh")
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {otherParentOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          <span className="inline-flex items-center gap-1">
                            {p.givenName}
                            {p.fatherName ? ` (${p.fatherName})` : ""}
                            {isTwin(p, people) ? (
                              <TwinBadge
                                compact
                                order={twinOrderInGroup(p, people)}
                                total={twinGroupSize(p, people)}
                              />
                            ) : null}
                          </span>
                        </SelectItem>
                      ))}
                      {addingViaMother && (
                        <SelectItem value="other">
                          {t("personForm.otherFather")}
                        </SelectItem>
                      )}
                      {addingViaFather && (
                        <SelectItem value="unnamed">
                          {t("personForm.unnamedMother")}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {otherParentId === "other"
                      ? t("personForm.otherFatherHint")
                      : otherParentId === "unnamed"
                        ? t("personForm.unnamedMotherHint")
                        : t("personForm.otherParentHint")}
                  </p>
                </div>
              )}
            </div>
          )}

          {isEdit && (
            <div className="md:col-span-2 rounded-2xl border bg-muted/20 p-4 sm:p-5 space-y-4">
              <p className="font-semibold text-base">{t("personForm.parentsTitle")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{t("personForm.pickFather")}</Label>
                  <PersonSearchPicker
                    people={editFatherOptions}
                    value={editFatherId}
                    allowNone
                    noneLabel={t("personForm.noParent")}
                    placeholder={t("personForm.pickFatherPh")}
                    searchPlaceholder={t("personForm.searchParentPh")}
                    excludeId={person?.id}
                    onChange={(v) => {
                      setEditFatherId(v);
                      if (v && editMotherId) {
                        const father = byId.get(parseInt(v, 10));
                        if (father) {
                          const wives = oppositeSpouses(father, spousesOf, byId);
                          if (
                            wives.length > 0 &&
                            !wives.some((p) => String(p.id) === editMotherId)
                          ) {
                            setEditMotherId("");
                          }
                        }
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{t("personForm.pickMother")}</Label>
                  <PersonSearchPicker
                    people={editMotherOptions}
                    value={editMotherId}
                    allowNone
                    noneLabel={t("personForm.noParent")}
                    placeholder={t("personForm.pickMotherPh")}
                    searchPlaceholder={t("personForm.searchParentPh")}
                    excludeId={person?.id}
                    disabled={!editFatherPerson}
                    onChange={(v) => setEditMotherId(v)}
                  />
                  {!editFatherPerson ? (
                    <p className="text-xs text-muted-foreground">
                      {t("personForm.editMotherNeedsFather")}
                    </p>
                  ) : editMotherOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t("personForm.editMotherNoSpouses")}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("personForm.editMotherFromFather", {
                        name: editFatherPerson.givenName,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* صورة */}
          <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border bg-muted/30 p-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 bg-background shadow-sm">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <Camera className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="space-y-2 flex-1">
              <Label className="text-sm font-medium">{t("personForm.photo")}</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                >
                  {t("personForm.photoPick")}
                </Button>
                {photoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setPhotoUrl(null)}
                  >
                    <X className="h-4 w-4" /> {t("personForm.photoRemove")}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("personForm.photoHint")}</p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickPhoto(e.target.files?.[0])}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">{t("personForm.givenName")} *</Label>
            <Input
              className="h-11 text-base"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              placeholder={t("personForm.givenNamePh")}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">
              {addingViaMother
                ? t("personForm.lineageFromFather")
                : t("personForm.fatherName")}
            </Label>
            <Input
              className="h-11 text-base font-display"
              value={fatherName}
              onChange={(e) => {
                setLineageTouched(true);
                setFatherName(e.target.value);
              }}
              placeholder={t("personForm.fatherNamePh")}
            />
            {!isEdit && lineageMatches.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 space-y-2">
                <p className="text-xs font-medium text-amber-900">
                  {t("personForm.lineageMatches")}
                </p>
                {lineageMatches.slice(0, 5).map((m) => {
                  const isSibling = m.kind === "sibling";
                  return (
                  <div
                    key={`${m.kind ?? "same"}-${m.personId}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/80 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-1 text-sm font-medium">
                        <span className="truncate">{m.givenName}</span>
                        {(() => {
                          const mp = people.find((x) => x.id === m.personId);
                          return mp && isTwin(mp, people) ? (
                            <TwinBadge
                              compact
                              order={twinOrderInGroup(mp, people)}
                              total={twinGroupSize(mp, people)}
                            />
                          ) : null;
                        })()}
                        {isSibling && (
                          <span className="text-[10px] font-normal text-amber-700">
                            ({t("personForm.siblingMatch")})
                          </span>
                        )}
                      </p>
                      {m.fatherName && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {m.fatherName}
                        </p>
                      )}
                    </div>
                    {!isSibling && (
                      <Button
                        type="button"
                        size="sm"
                        variant={linkExistingId === m.personId ? "default" : "outline"}
                        className="h-7 text-xs shrink-0"
                        onClick={() => {
                          setLinkExistingId(
                            linkExistingId === m.personId ? null : m.personId,
                          );
                        }}
                      >
                        {linkExistingId === m.personId
                          ? t("personForm.linkedSelected")
                          : t("personForm.linkExisting")}
                      </Button>
                    )}
                  </div>
                  );
                })}
                {lineageMatches.some((m) => m.kind === "sibling") && (
                  <p className="text-[11px] text-amber-800">
                    {t("personForm.siblingMatchHint")}
                  </p>
                )}
                {highConfidenceMatch &&
                  highConfidenceMatch.kind !== "sibling" &&
                  linkExistingId !== highConfidenceMatch.personId && (
                  <p className="text-[11px] text-amber-800">
                    {t("personForm.lineageMatchHint")}
                  </p>
                )}
              </div>
            )}
            {!isEdit && lineageSegments > 0 && !linkExistingId && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={createBranchFromLineage}
                  onChange={(e) => setCreateBranchFromLineage(e.target.checked)}
                  className="rounded"
                />
                {t("personForm.createBranchFromLineage")}
              </label>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t("personForm.kunya")}</Label>
            <Input
              className="h-11"
              value={kunya}
              onChange={(e) => setKunya(e.target.value)}
              placeholder={t("personForm.kunyaPh")}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t("personForm.laqab")}</Label>
            <Input
              className="h-11"
              value={laqab}
              onChange={(e) => setLaqab(e.target.value)}
              placeholder={t("personForm.laqabPh")}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t("personForm.clan")}</Label>
            <Input
              className="h-11"
              value={clan}
              onChange={(e) => setClan(e.target.value)}
              placeholder={t("personForm.clanPh")}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">{t("personForm.gender")}</Label>
            <Select
              value={gender}
              onValueChange={(v) => setGender(v as "male" | "female")}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">{t("common.male")}</SelectItem>
                <SelectItem value="female">{t("common.female")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* أداة التوأم */}
          {(isSiblingKinship || isChildKinship || isEdit) && (
            <div className="md:col-span-2 rounded-2xl border border-violet-200 bg-violet-50/50 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-violet-700" />
                  <div>
                    <p className="font-semibold text-sm text-violet-950">
                      {t("twins.formTitle")}
                    </p>
                    <p className="text-xs text-violet-800/80">
                      {t("twins.formHint")}
                    </p>
                  </div>
                  {isEdit && isTwin(person) && <TwinBadge />}
                </div>
                <Switch
                  checked={isTwinMode}
                  onCheckedChange={(v) => {
                    setIsTwinMode(v);
                    if (!v && isEdit && person && isTwin(person)) {
                      setClearTwinOnSave(true);
                    } else {
                      setClearTwinOnSave(false);
                    }
                  }}
                />
              </div>

              {isTwinMode && (
                <div className="space-y-2">
                  <Label className="text-sm">{t("twins.twinOf")}</Label>
                  <Select
                    value={twinOfId || "none"}
                    onValueChange={(v) =>
                      setTwinOfId(v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger className="h-11 bg-white">
                      <SelectValue placeholder={t("twins.pickSibling")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("twins.pickSibling")}</SelectItem>
                      {twinPickerOptions.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          <span className="inline-flex items-center gap-1">
                            {p.givenName}
                            {isTwin(p, people) ? (
                              <TwinBadge
                                compact
                                order={twinOrderInGroup(p, people)}
                                total={twinGroupSize(p, people)}
                              />
                            ) : null}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {twinPickerOptions.length === 0 && (
                    <p className="text-xs text-amber-800">
                      {t("twins.needBothParents")}
                    </p>
                  )}
                  {selectedTwin && (
                    <p className="text-xs text-violet-800">
                      {t("twins.birthCopied", { name: selectedTwin.givenName })}
                    </p>
                  )}
                </div>
              )}

              {isEdit && currentTwins.length > 0 && isTwinMode && (
                <p className="text-xs text-muted-foreground">
                  {t("twins.currentGroup", {
                    names: currentTwins.map((p) => p.givenName).join("، "),
                  })}
                </p>
              )}
            </div>
          )}

          {/* تاريخ الميلاد: يوم / شهر / سنة */}
          <div className="md:col-span-2 space-y-2">
            <Label className="text-sm">{t("personForm.birthDate")}</Label>
            <p className="text-xs text-muted-foreground">{t("personForm.birthDateHint")}</p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                className="h-11"
                type="number"
                min={1}
                max={31}
                value={birthDay}
                onChange={(e) => setBirthDay(e.target.value)}
                placeholder={t("personForm.day")}
              />
              <Input
                className="h-11"
                type="number"
                min={1}
                max={12}
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                placeholder={t("personForm.month")}
              />
              <Input
                className="h-11"
                type="number"
                min={1}
                max={2100}
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                placeholder={t("personForm.year")}
              />
            </div>
            <Label className="text-sm">{t("personForm.birthPlace")}</Label>
            <Input
              className="h-11"
              value={birthPlace}
              onChange={(e) => setBirthPlace(e.target.value)}
              placeholder={t("personForm.birthPlacePh")}
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border bg-muted/20 px-4 py-3 md:col-span-2">
            <Label className="cursor-pointer text-sm font-medium">{t("personForm.isLiving")}</Label>
            <Switch checked={isLiving} onCheckedChange={setIsLiving} />
          </div>

          {!isLiving && (
            <div className="md:col-span-2 space-y-2">
              <Label className="text-sm">{t("personForm.deathDate")}</Label>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  max={31}
                  value={deathDay}
                  onChange={(e) => setDeathDay(e.target.value)}
                  placeholder={t("personForm.day")}
                />
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  max={12}
                  value={deathMonth}
                  onChange={(e) => setDeathMonth(e.target.value)}
                  placeholder={t("personForm.month")}
                />
                <Input
                  className="h-11"
                  type="number"
                  min={1}
                  max={2100}
                  value={deathYear}
                  onChange={(e) => setDeathYear(e.target.value)}
                  placeholder={t("personForm.year")}
                />
              </div>
              <Label className="text-sm">{t("personForm.deathPlace")}</Label>
              <Input
                className="h-11"
                value={deathPlace}
                onChange={(e) => setDeathPlace(e.target.value)}
                placeholder={t("personForm.deathPlacePh")}
              />
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm">{t("personForm.privacy")}</Label>
            <Select
              value={privacy}
              onValueChange={(v) => setPrivacy(v as PersonPrivacy)}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(L.privacy) as PersonPrivacy[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {L.privacy[k]} {t("common.emDash")} {L.privacyDescriptions[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm">{t("personForm.notes")}</Label>
            <Textarea
              className="min-h-[96px] text-base"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={t("personForm.notesPh")}
            />
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-4 sm:px-6 py-4 gap-2 flex-col-reverse sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            className="h-11 px-6 w-full sm:w-auto"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button className="h-11 px-8 w-full sm:w-auto" onClick={submit} disabled={pending}>
            {pending
              ? t("common.saving")
              : isEdit
                ? t("common.save")
                : t("personForm.addBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
