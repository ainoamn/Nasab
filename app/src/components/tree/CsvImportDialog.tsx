import { useRef, useState } from "react";
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
import { toast } from "sonner";
import { FileSpreadsheet, Upload, Download } from "lucide-react";

type Row = {
  givenName: string;
  fatherName?: string | null;
  gender: "male" | "female";
  birthYear?: number | null;
  deathYear?: number | null;
  kunya?: string | null;
  laqab?: string | null;
  clan?: string | null;
  notes?: string | null;
};

const TEMPLATE = `الاسم,اسم الأب,الجنس,سنة الميلاد,سنة الوفاة,الكنية,اللقب,الفخذ,ملاحظات
سالم,,male,1930,,أبو محمد,,,
محمد,سالم,male,1955,,أبو أحمد,,,
أحمد,محمد,male,1980,,,,,
مريم,محمد,female,1983,,,,,`;

function parseCsv(text: string): Row[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const rows: Row[] = [];
  const start = lines[0].includes("الاسم") || lines[0].toLowerCase().includes("name") ? 1 : 0;
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (!cols[0]) continue;
    const genderRaw = (cols[2] || "").toLowerCase();
    rows.push({
      givenName: cols[0],
      fatherName: cols[1] || null,
      gender: genderRaw === "female" || genderRaw === "أنثى" ? "female" : "male",
      birthYear: cols[3] ? parseInt(cols[3], 10) || null : null,
      deathYear: cols[4] ? parseInt(cols[4], 10) || null : null,
      kunya: cols[5] || null,
      laqab: cols[6] || null,
      clan: cols[7] || null,
      notes: cols[8] || null,
    });
  }
  return rows;
}

export default function CsvImportDialog({
  treeId,
  open,
  onOpenChange,
}: {
  treeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [fileName, setFileName] = useState("");

  const mut = trpc.person.bulkImport.useMutation({
    onSuccess: async (res) => {
      toast.success(t("importDlg.success", { created: res.created, linked: res.linked }));
      await utils.person.list.invalidate({ treeId });
      await utils.tree.listMine.invalidate();
      setRows([]);
      setFileName("");
      onOpenChange(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const onFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length === 0) {
      toast.error(t("importDlg.noNames"));
      return;
    }
    setRows(parsed);
    setFileName(file.name);
  };

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family-tree-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {t("importDlg.title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">{t("importDlg.body")}</p>

          <Button variant="outline" className="w-full gap-2" onClick={downloadTemplate}>
            <Download className="h-4 w-4" />
            {t("importDlg.template")}
          </Button>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          <Button
            variant="secondary"
            className="w-full gap-2 border-2 border-dashed h-20"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-5 w-5" />
            {fileName ? t("importDlg.fileLabel", { name: fileName }) : t("importDlg.pickFile")}
          </Button>

          {rows.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <p className="font-medium mb-1">{t("importDlg.ready", { count: rows.length })}</p>
              <p className="text-muted-foreground text-xs">
                {t("importDlg.firstNames", {
                  names: rows.slice(0, 5).map((r) => r.givenName).join(", ") + (rows.length > 5 ? "..." : ""),
                })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
          <Button onClick={() => mut.mutate({ treeId, rows })} disabled={rows.length === 0 || mut.isPending}>
            {mut.isPending ? t("importDlg.importing") : t("importDlg.importBtn")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
