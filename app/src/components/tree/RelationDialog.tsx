import { useEffect, useMemo, useState } from "react";
import type { Person, Relationship } from "@db/schema";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PersonSearchPicker from "@/components/tree/PersonSearchPicker";
import { buildSpousesOf, oppositeSpouses } from "@/lib/familyGraph";
import { toast } from "sonner";

type Kinship =
  | "son"
  | "daughter"
  | "father"
  | "mother"
  | "brother"
  | "sister"
  | "spouse";

type Props = {
  treeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  rels: Relationship[];
  anchor?: Person | null;
  unlinkedIds?: Set<number>;
  onLinked?: () => void;
};

const KINSHIPS: Kinship[] = [
  "son",
  "daughter",
  "brother",
  "sister",
  "father",
  "mother",
  "spouse",
];

function parseOpt(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export default function RelationDialog({
  treeId,
  open,
  onOpenChange,
  people,
  rels,
  anchor,
  unlinkedIds,
  onLinked,
}: Props) {
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const [otherId, setOtherId] = useState<string>("");
  const [kinship, setKinship] = useState<Kinship>("son");
  const [otherParentId, setOtherParentId] = useState<string>("");
  const [marriageYear, setMarriageYear] = useState("");
  const [marriageMonth, setMarriageMonth] = useState("");
  const [marriageDay, setMarriageDay] = useState("");
  const [divorceYear, setDivorceYear] = useState("");
  const [divorceMonth, setDivorceMonth] = useState("");
  const [divorceDay, setDivorceDay] = useState("");

  const byId = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people],
  );
  const spousesOf = useMemo(() => buildSpousesOf(rels), [rels]);

  const isChildKinship = kinship === "son" || kinship === "daughter";
  const addingViaFather =
    isChildKinship && anchor?.gender === "male";
  const addingViaMother =
    isChildKinship && anchor?.gender === "female";

  const otherParentOptions = useMemo(() => {
    if (!anchor || !isChildKinship) return [];
    return oppositeSpouses(anchor, spousesOf, byId);
  }, [anchor, isChildKinship, spousesOf, byId]);

  useEffect(() => {
    if (!open) return;
    setOtherId("");
    setKinship("son");
    setOtherParentId("");
    setMarriageYear("");
    setMarriageMonth("");
    setMarriageDay("");
    setDivorceYear("");
    setDivorceMonth("");
    setDivorceDay("");
  }, [open, anchor?.id]);

  useEffect(() => {
    if (!open || !isChildKinship) return;
    if (otherParentOptions.length === 1) {
      setOtherParentId(String(otherParentOptions[0].id));
    } else {
      setOtherParentId("");
    }
  }, [open, isChildKinship, kinship, anchor?.id, otherParentOptions]);

  const mut = trpc.person.linkExistingKinship.useMutation({
    onSuccess: async () => {
      toast.success(t("relation.linked"));
      await utils.person.list.invalidate({ treeId });
      await utils.person.list.refetch({ treeId });
      await utils.tree.listMine.invalidate();
      onLinked?.();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const submit = () => {
    if (!anchor || !otherId) {
      toast.error(t("relation.pickFirst"));
      return;
    }
    if (
      isChildKinship &&
      otherParentOptions.length > 1 &&
      !otherParentId
    ) {
      toast.error(
        addingViaFather
          ? t("personForm.motherRequired")
          : t("personForm.fatherRequired"),
      );
      return;
    }

    mut.mutate({
      treeId,
      anchorId: anchor.id,
      otherId: parseInt(otherId, 10),
      kinship,
      otherParentId:
        otherParentId && otherParentId !== "unnamed"
          ? parseInt(otherParentId, 10)
          : undefined,
      createUnnamedMother:
        addingViaFather && otherParentId === "unnamed" ? true : undefined,
      marriageYear: parseOpt(marriageYear),
      marriageMonth: parseOpt(marriageMonth),
      marriageDay: parseOpt(marriageDay),
      divorceYear: parseOpt(divorceYear),
      divorceMonth: parseOpt(divorceMonth),
      divorceDay: parseOpt(divorceDay),
    });
  };

  const name = anchor?.givenName ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {t("relation.title", { name })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("relation.type")}</Label>
            <Select
              value={kinship}
              onValueChange={(v) => setKinship(v as Kinship)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINSHIPS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`relation.kinships.${k}`, { name })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t(`relation.kinshipHint.${kinship}`, { name })}
            </p>
          </div>
          <div className="space-y-2">
            <Label>{t("relation.other")}</Label>
            <PersonSearchPicker
              people={people}
              value={otherId}
              onChange={setOtherId}
              excludeId={anchor?.id}
              unlinkedIds={unlinkedIds}
              placeholder={t("relation.otherPh")}
            />
          </div>
          {isChildKinship &&
            (addingViaFather || addingViaMother) &&
            (otherParentOptions.length > 0 || addingViaFather) && (
              <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                <Label>
                  {addingViaFather
                    ? t("personForm.pickMother")
                    : t("personForm.pickFather")}
                  {(otherParentOptions.length > 1 || addingViaFather) && " *"}
                </Label>
                <Select value={otherParentId} onValueChange={setOtherParentId}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        addingViaFather
                          ? t("personForm.pickMotherPh")
                          : t("personForm.pickFatherPh")
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {otherParentOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.givenName}
                        {p.fatherName ? ` (${p.fatherName})` : ""}
                      </SelectItem>
                    ))}
                    {addingViaFather && (
                      <SelectItem value="unnamed">
                        {t("personForm.unnamedMother")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {otherParentId === "unnamed"
                    ? t("personForm.unnamedMotherHint")
                    : t("personForm.otherParentHint")}
                </p>
              </div>
            )}
          {kinship === "spouse" && (
            <div className="rounded-xl border bg-muted/30 p-3 space-y-3">
              <p className="text-sm font-medium">{t("relation.marriageDates")}</p>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder={t("personForm.day")}
                  value={marriageDay}
                  onChange={(e) => setMarriageDay(e.target.value)}
                />
                <Input
                  placeholder={t("personForm.month")}
                  value={marriageMonth}
                  onChange={(e) => setMarriageMonth(e.target.value)}
                />
                <Input
                  placeholder={t("personForm.year")}
                  value={marriageYear}
                  onChange={(e) => setMarriageYear(e.target.value)}
                />
              </div>
              <p className="text-sm font-medium">{t("relation.divorceDates")}</p>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder={t("personForm.day")}
                  value={divorceDay}
                  onChange={(e) => setDivorceDay(e.target.value)}
                />
                <Input
                  placeholder={t("personForm.month")}
                  value={divorceMonth}
                  onChange={(e) => setDivorceMonth(e.target.value)}
                />
                <Input
                  placeholder={t("personForm.year")}
                  value={divorceYear}
                  onChange={(e) => setDivorceYear(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? t("relation.linking") : t("common.link")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
