import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import type { Person, Relationship } from "@db/tables";
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
import { toast } from "sonner";
import { Heart } from "lucide-react";

type Props = {
  treeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationship: Relationship | null;
  personA?: Person | null;
  personB?: Person | null;
};

/** تعديل تواريخ الزواج/الانفصال بعد إنشاء الرابط */
export default function SpouseDatesDialog({
  treeId,
  open,
  onOpenChange,
  relationship,
  personA,
  personB,
}: Props) {
  const { t } = useTranslation();
  const utils = trpc.useUtils();
  const [marriageYear, setMarriageYear] = useState("");
  const [divorceYear, setDivorceYear] = useState("");

  useEffect(() => {
    if (!open || !relationship) return;
    setMarriageYear(
      relationship.marriageYear != null ? String(relationship.marriageYear) : "",
    );
    setDivorceYear(
      relationship.divorceYear != null ? String(relationship.divorceYear) : "",
    );
  }, [open, relationship]);

  const mut = trpc.person.updateSpouseDates.useMutation({
    onSuccess: async () => {
      toast.success(t("spouseDates.saved"));
      await utils.person.list.invalidate({ treeId });
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const title =
    personA && personB
      ? `${personA.givenName} ↔ ${personB.givenName}`
      : t("spouseDates.title");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-500" />
            {t("spouseDates.title")}
          </DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="marr-year">{t("spouseDates.marriageYear")}</Label>
            <Input
              id="marr-year"
              inputMode="numeric"
              placeholder="1990"
              value={marriageYear}
              onChange={(e) => setMarriageYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="div-year">{t("spouseDates.divorceYear")}</Label>
            <Input
              id="div-year"
              inputMode="numeric"
              placeholder=""
              value={divorceYear}
              onChange={(e) => setDivorceYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!relationship || mut.isPending}
            onClick={() => {
              if (!relationship) return;
              const my = marriageYear ? Number(marriageYear) : null;
              const dy = divorceYear ? Number(divorceYear) : null;
              mut.mutate({
                treeId,
                relationshipId: relationship.id,
                marriageYear: my && my > 0 ? my : null,
                marriageMonth: null,
                marriageDay: null,
                divorceYear: dy && dy > 0 ? dy : null,
                divorceMonth: null,
                divorceDay: null,
              });
            }}
          >
            {mut.isPending ? t("spouseDates.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
