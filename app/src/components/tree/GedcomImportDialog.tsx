import { useRef, useState } from "react";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileDown, Upload } from "lucide-react";
import { parseGedcom } from "@/lib/gedcomImport";

type Props = {
  treeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** استيراد ملف GEDCOM (.ged) إلى الشجرة */
export default function GedcomImportDialog({
  treeId,
  open,
  onOpenChange,
}: Props) {
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [replace, setReplace] = useState(false);
  const [preview, setPreview] = useState<{
    people: number;
    links: number;
    twins: number;
    sample: string[];
  } | null>(null);
  const [payload, setPayload] = useState<ReturnType<typeof parseGedcom> | null>(
    null,
  );

  const mut = trpc.person.importGedcom.useMutation({
    onSuccess: async (res) => {
      toast.success(
        t("gedcomImport.success", {
          created: res.created,
          linked: res.linked,
          twins: res.twinGroups ?? 0,
          skipped: res.skipped ?? 0,
        }),
      );
      await utils.person.list.invalidate({ treeId });
      await utils.tree.listMine.invalidate();
      setPayload(null);
      setPreview(null);
      setFileName("");
      setReplace(false);
      onOpenChange(false);
    },
    onError: (e) => {
      const raw = e.message || "";
      const looksLikeHtml =
        /not valid JSON/i.test(raw) ||
        /Unexpected token/i.test(raw) ||
        /^An error/i.test(raw);
      toast.error(looksLikeHtml ? t("gedcomImport.timeout") : raw);
    },
  });

  const onFile = async (file: File) => {
    const text = await file.text();
    try {
      const parsed = parseGedcom(text);
      if (parsed.people.length === 0) {
        toast.error(t("gedcomImport.noPeople"));
        return;
      }
      setPayload(parsed);
      setFileName(file.name);
      const twinKeys = new Set(
        parsed.people
          .map((p) => p.twinGroupKey)
          .filter((k): k is string => Boolean(k)),
      );
      setPreview({
        people: parsed.people.length,
        links: parsed.links.length,
        twins: twinKeys.size,
        sample: parsed.people.slice(0, 5).map((p) => p.givenName),
      });
    } catch {
      toast.error(t("gedcomImport.parseError"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-sky-600" />
            {t("gedcomImport.title")}
          </DialogTitle>
          <DialogDescription>{t("gedcomImport.hint")}</DialogDescription>
        </DialogHeader>

        <input
          ref={fileRef}
          type="file"
          accept=".ged,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
            e.target.value = "";
          }}
        />

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {t("gedcomImport.pickFile")}
        </Button>

        {preview && (
          <div className="rounded-xl border bg-muted/30 p-3 text-sm space-y-1.5">
            <p className="font-medium truncate">{fileName}</p>
            <p className="text-muted-foreground">
              {t("gedcomImport.preview", {
                people: preview.people,
                links: preview.links,
                twins: preview.twins,
              })}
            </p>
            {preview.sample.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {preview.sample.join(" · ")}
                {preview.people > preview.sample.length ? "…" : ""}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{t("gedcomImport.mergeHint")}</p>
            <label className="flex items-center gap-2 text-xs pt-1">
              <input
                type="checkbox"
                checked={replace}
                onChange={(e) => setReplace(e.target.checked)}
              />
              {t("gedcomImport.replace")}
            </label>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!payload || mut.isPending}
            onClick={() => {
              if (!payload) return;
              mut.mutate({
                treeId,
                mode: replace ? "replace" : "merge",
                people: payload.people,
                links: payload.links,
              });
            }}
          >
            {mut.isPending
              ? t("gedcomImport.importing")
              : t("gedcomImport.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
