import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  PRINT_PAPER_SIZES,
  type PrintPaperSize,
} from "@/lib/printFilter";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "nasab-print";
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function waitForPaint(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
  await new Promise((r) => setTimeout(r, 80));
}

/**
 * يلتقط ورقة الطباعة كاملة (ترويسة + مخطط + تذييل) بدقة عالية.
 */
export async function capturePrintSheetPng(opts?: {
  pixelRatio?: number;
  backgroundColor?: string;
}): Promise<string> {
  const sheet = document.querySelector(".print-sheet") as HTMLElement | null;
  if (!sheet) {
    throw new Error("print-sheet-not-found");
  }

  // أزل أي تصغير مؤقت من حوار الطباعة
  const prevTransform = sheet.style.transform;
  const prevOrigin = sheet.style.transformOrigin;
  const prevOverflow = sheet.style.overflow;
  const prevMaxH = sheet.style.maxHeight;
  const prevHeight = sheet.style.height;
  const prevWidth = sheet.style.width;
  const prevMaxW = sheet.style.maxWidth;
  sheet.style.transform = "none";
  sheet.style.transformOrigin = "";
  sheet.style.overflow = "visible";
  sheet.style.maxHeight = "none";
  sheet.style.height = "auto";
  // أعرض الورقة قدر الإمكان قبل الالتقاط لدقة أوضح
  sheet.style.width = "1600px";
  sheet.style.maxWidth = "1600px";

  try {
    await waitForPaint();
    const bg =
      opts?.backgroundColor ||
      sheet.style.backgroundColor ||
      getComputedStyle(sheet).backgroundColor ||
      "#ffffff";

    // كامل الوثيقة: ترويسة الإحصائيات + المخطط + التذييل
    const target =
      (sheet.querySelector(".sun-mh-print") as HTMLElement | null) ||
      (sheet.querySelector(".print-fan-root") as HTMLElement | null) ||
      (sheet.querySelector(".print-palm") as HTMLElement | null) ||
      sheet;

    const ratio = opts?.pixelRatio ?? 4;
    return await toPng(target, {
      cacheBust: true,
      pixelRatio: ratio,
      backgroundColor: bg,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        if (node.classList.contains("no-print")) return false;
        if (node.closest?.(".no-print")) return false;
        return true;
      },
    });
  } finally {
    sheet.style.transform = prevTransform;
    sheet.style.transformOrigin = prevOrigin;
    sheet.style.overflow = prevOverflow;
    sheet.style.maxHeight = prevMaxH;
    sheet.style.height = prevHeight;
    sheet.style.width = prevWidth;
    sheet.style.maxWidth = prevMaxW;
  }
}

export async function downloadPrintPng(opts: {
  title: string;
  pixelRatio?: number;
}): Promise<void> {
  const dataUrl = await capturePrintSheetPng({
    pixelRatio: opts.pixelRatio ?? 4,
  });
  triggerDownload(dataUrl, `${sanitizeFilename(opts.title)}.png`);
}

export async function downloadPrintPdf(opts: {
  title: string;
  paperSize: PrintPaperSize;
  pixelRatio?: number;
}): Promise<void> {
  const paper = PRINT_PAPER_SIZES[opts.paperSize];
  const dataUrl = await capturePrintSheetPng({
    pixelRatio: opts.pixelRatio ?? 4,
    backgroundColor: "#FBF7EF",
  });

  // قياس نسبة الصورة ثم صفحة بنفس النسبة — بلا حواف بيضاء (مثل PNG)
  const measure = new jsPDF({ unit: "mm", format: "a4" });
  const img = measure.getImageProperties(dataUrl);
  const aspect = img.width / Math.max(img.height, 1);

  const longSide = Math.max(paper.widthMm, paper.heightMm);
  const shortSide = Math.min(paper.widthMm, paper.heightMm);
  let pageW: number;
  let pageH: number;
  if (aspect >= 1) {
    pageW = longSide;
    pageH = pageW / aspect;
    if (pageH < shortSide * 0.55) {
      pageH = shortSide * 0.55;
      pageW = pageH * aspect;
    }
  } else {
    pageH = longSide;
    pageW = pageH * aspect;
    if (pageW < shortSide * 0.55) {
      pageW = shortSide * 0.55;
      pageH = pageW / aspect;
    }
  }

  const pdf = new jsPDF({
    orientation: pageW >= pageH ? "landscape" : "portrait",
    unit: "mm",
    format: [pageW, pageH],
    compress: true,
  });

  pdf.setFillColor(251, 247, 239);
  pdf.rect(0, 0, pageW, pageH, "F");
  pdf.addImage(dataUrl, "PNG", 0, 0, pageW, pageH, undefined, "NONE");
  pdf.save(`${sanitizeFilename(opts.title)}.pdf`);
}
