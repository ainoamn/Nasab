import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/schema";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Users2, UserPlus, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TwinBadge from "@/components/tree/TwinBadge";
import { getParents } from "@/lib/familyGraph";
import {
  getTwinGroupMembers,
  isTwin,
  twinCandidateSiblings,
  twinKindForGroup,
  twinOrderInGroup,
  twinGroupSize,
} from "@/lib/twins";
import { formatBirthDate } from "@/lib/birthOrder";

type Props = {
  treeId: number;
  person: Person;
  siblings: Person[];
  people: Person[];
  rels: Relationship[];
  canWrite: boolean;
  onAddTwin: () => void;
  onSelectTwin: (person: Person) => void;
  onChanged?: () => void;
};

/** لوحة إدارة التوائم — عرض، ربط، وفك */
export default function TwinFamilyPanel({
  treeId,
  person,
  siblings,
  people,
  rels,
  canWrite,
  onAddTwin,
  onSelectTwin,
  onChanged,
}: Props) {
  const { t, i18n } = useTranslation();
  const utils = trpc.useUtils();

  const twins = useMemo(
    () => getTwinGroupMembers(person, people),
    [person, people],
  );
  const candidates = useMemo(
    () => twinCandidateSiblings(person, siblings, rels, people),
    [person, siblings, rels, people],
  );
  const twinKind = useMemo(
    () => twinKindForGroup(person, people),
    [person, people],
  );
  const order = twinOrderInGroup(person, people);
  const twinTotal = twinGroupSize(person, people);
  const showAsTwin = isTwin(person, people);

  const missingBothParents = useMemo(() => {
    const byId = new Map(people.map((p) => [p.id, p]));
    const parents = getParents(person.id, rels, byId);
    return parents.fatherId == null || parents.motherId == null;
  }, [person.id, people, rels]);

  const linkMut = trpc.person.linkTwin.useMutation({
    onSuccess: () => {
      toast.success(t("twins.linked"));
      void utils.person.list.invalidate({ treeId });
      onChanged?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const unlinkMut = trpc.person.unlinkTwin.useMutation({
    onSuccess: () => {
      toast.success(t("twins.unlinked"));
      void utils.person.list.invalidate({ treeId });
      onChanged?.();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!showAsTwin && candidates.length === 0 && !canWrite) return null;

  return (
    <div className="rounded-xl border-2 border-violet-300 bg-violet-50/50 p-4 space-y-3 print:border-violet-600">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users2 className="h-4 w-4 text-violet-700" />
          <p className="text-sm font-semibold text-violet-950">
            {t("twins.panelTitle")}
          </p>
          {showAsTwin && (
            <TwinBadge kind={twinKind} order={order} total={twinTotal} />
          )}
        </div>
        {canWrite && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 border-violet-300 text-violet-900 hover:bg-violet-100"
            onClick={onAddTwin}
            disabled={missingBothParents}
            title={missingBothParents ? t("twins.needBothParents") : undefined}
          >
            <UserPlus className="h-3.5 w-3.5" />
            {t("twins.addNew")}
          </Button>
        )}
      </div>

      {canWrite && missingBothParents && (
        <p className="text-xs text-amber-800">{t("twins.needBothParents")}</p>
      )}

      {showAsTwin && (
        <p className="text-xs text-violet-800/90">
          {t("twins.orderHint", {
            order: order ?? 1,
            total: twinTotal,
          })}
        </p>
      )}

      {twins.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {twins.map((twin) => (
            <button
              key={twin.id}
              type="button"
              onClick={() => onSelectTwin(twin)}
              className="flex items-center gap-2 rounded-lg border-2 border-violet-300 bg-white px-2.5 py-1.5 text-start text-sm shadow-sm transition hover:border-violet-500 hover:bg-violet-50"
            >
              <span className={cnAvatar(twin.gender)}>
                {twin.givenName.slice(0, 1)}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1">
                  <span className="font-medium truncate">{twin.givenName}</span>
                  <TwinBadge
                    compact
                    order={twinOrderInGroup(twin, people)}
                    total={twinTotal}
                  />
                </span>
                {formatBirthDate(twin, i18n.language) && (
                  <span className="block text-[10px] text-muted-foreground">
                    {formatBirthDate(twin, i18n.language)}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{t("twins.noneYet")}</p>
      )}

      {canWrite && candidates.length > 0 && (
        <div className="flex flex-wrap items-end gap-2 border-t border-violet-200/60 pt-3">
          <div className="min-w-[10rem] flex-1 space-y-1">
            <p className="text-xs font-medium text-violet-900">
              {t("twins.linkExisting")}
            </p>
            <Select
              onValueChange={(v) => {
                linkMut.mutate({
                  treeId,
                  personId: person.id,
                  twinOfPersonId: parseInt(v, 10),
                });
              }}
            >
              <SelectTrigger className="h-9 bg-white">
                <SelectValue placeholder={t("twins.pickSibling")} />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.givenName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {canWrite && showAsTwin && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 text-muted-foreground hover:text-destructive"
          disabled={unlinkMut.isPending}
          onClick={() => {
            if (!window.confirm(t("twins.unlinkConfirm"))) return;
            unlinkMut.mutate({ treeId, personId: person.id });
          }}
        >
          <Unlink className="h-3.5 w-3.5" />
          {t("twins.unlink")}
        </Button>
      )}
    </div>
  );
}

function cnAvatar(gender: string) {
  return [
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
    gender === "female" ? "bg-pink-500" : "bg-sky-600",
  ].join(" ");
}
