import type { PrintPaperSize } from "@/lib/printFilter";
import { PRINT_PAPER_SIZES } from "@/lib/printFilter";

/**
 * يضغط ورقة الطباعة لتناسب صفحة واحدة بلا تقسيم بالطول أو العرض.
 * يُستدعى قبل الطباعة ويُزال بعدها.
 */
export function fitPrintSheetToPage(paperSize: PrintPaperSize): () => void {
  const sheet = document.querySelector(".print-sheet") as HTMLElement | null;
  if (!sheet) return () => undefined;

  const paper = PRINT_PAPER_SIZES[paperSize];
  const marginMm = parseFloat(paper.margin) || 6;
  const padMm = 1.2;
  const printableWmm = paper.widthMm - 2 * (marginMm + padMm);
  const printableHmm = paper.heightMm - 2 * (marginMm + padMm);

  const prev = {
    transform: sheet.style.transform,
    transformOrigin: sheet.style.transformOrigin,
    width: sheet.style.width,
    maxWidth: sheet.style.maxWidth,
    height: sheet.style.height,
    maxHeight: sheet.style.maxHeight,
    overflow: sheet.style.overflow,
    margin: sheet.style.margin,
    marginBottom: sheet.style.marginBottom,
    marginLeft: sheet.style.marginLeft,
    marginRight: sheet.style.marginRight,
  };

  sheet.style.transform = "none";
  sheet.style.width = "auto";
  sheet.style.maxWidth = "none";
  sheet.style.height = "auto";
  sheet.style.maxHeight = "none";
  sheet.style.overflow = "visible";
  sheet.style.margin = "0 auto";
  sheet.style.marginBottom = "";
  sheet.style.marginLeft = "";
  sheet.style.marginRight = "";

  const rect = sheet.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) {
    return () => undefined;
  }

  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;left:-9999px;top:0;width:100mm;height:100mm;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const pxPerMm = probe.offsetWidth / 100 || 3.78;
  document.body.removeChild(probe);

  const maxW = printableWmm * pxPerMm;
  const maxH = printableHmm * pxPerMm;
  const scale = Math.min(1, maxW / rect.width, maxH / rect.height);

  sheet.style.transformOrigin = "top center";
  sheet.style.width = `${rect.width}px`;
  sheet.style.maxWidth = `${rect.width}px`;
  sheet.style.height = `${rect.height}px`;

  if (scale < 0.999) {
    sheet.style.transform = `scale(${scale})`;
    // قلّص المساحة التي يشغلها العنصر بعد التحويل حتى لا يُقصّ التذييل
    const shrinkH = rect.height * (1 - scale);
    const shrinkW = rect.width * (1 - scale);
    sheet.style.marginBottom = `${-shrinkH}px`;
    sheet.style.marginLeft = `${shrinkW / 2}px`;
    sheet.style.marginRight = `${shrinkW / 2}px`;
  }

  sheet.style.overflow = "visible";
  sheet.dataset.printFitScale = String(scale);

  return () => {
    sheet.style.transform = prev.transform;
    sheet.style.transformOrigin = prev.transformOrigin;
    sheet.style.width = prev.width;
    sheet.style.maxWidth = prev.maxWidth;
    sheet.style.height = prev.height;
    sheet.style.maxHeight = prev.maxHeight;
    sheet.style.overflow = prev.overflow;
    sheet.style.margin = prev.margin;
    sheet.style.marginBottom = prev.marginBottom;
    sheet.style.marginLeft = prev.marginLeft;
    sheet.style.marginRight = prev.marginRight;
    delete sheet.dataset.printFitScale;
  };
}
