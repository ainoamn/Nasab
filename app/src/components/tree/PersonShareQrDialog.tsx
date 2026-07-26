import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { PrintableDocumentShell } from "@/components/PrintableDocumentShell";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy } from "lucide-react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
  personName?: string;
};

/** حوار رمز QR لرابط شخص — يُولَّد محلياً للطباعة والتنزيل */
export default function PersonShareQrDialog({
  open,
  onOpenChange,
  url,
  title,
  personName,
}: Props) {
  const { t } = useTranslation();
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    if (!open || !url) {
      setDataUrl("");
      return;
    }
    let cancelled = false;
    void QRCode.toDataURL(url, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((d) => {
      if (!cancelled) setDataUrl(d);
    });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  const heading =
    title ??
    (personName
      ? t("share.qrTitlePerson", { name: personName })
      : t("share.qrTitle"));

  const downloadPng = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `nasab-qr-${personName?.replace(/\s+/g, "-") || "link"}.png`;
    a.click();
    toast.success(t("share.qrDownloaded"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-sm">
        <DialogHeader className="no-print">
          <DialogTitle>{heading}</DialogTitle>
          <DialogDescription>{t("share.qrHint")}</DialogDescription>
        </DialogHeader>

        <PrintableDocumentShell title={heading}>
          <article className="space-y-4 text-center" dir="auto">
            <header className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("brand")}</p>
              {personName && (
                <h1 className="font-display text-xl font-bold">{personName}</h1>
              )}
            </header>
            {dataUrl ? (
              <img
                src={dataUrl}
                alt=""
                width={280}
                height={280}
                className="mx-auto rounded-xl border bg-white p-2"
              />
            ) : (
              <p className="text-sm text-muted-foreground">…</p>
            )}
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              {url}
            </p>
            <div className="no-print flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  void navigator.clipboard.writeText(url);
                  toast.success(t("detail.linkCopied"));
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                {t("detail.copyPersonLink")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={!dataUrl}
                onClick={downloadPng}
              >
                <Download className="h-3.5 w-3.5" />
                {t("share.downloadQR")}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("share.qrFooter")}
            </p>
          </article>
        </PrintableDocumentShell>
      </DialogContent>
    </Dialog>
  );
}
