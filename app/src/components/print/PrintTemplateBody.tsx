import type { ComponentType } from "react";
import type { PrintTemplateId, PrintTemplateProps } from "./types";
import type { PrintPaperSize } from "@/lib/printFilter";
import { PRINT_PAPER_SIZES } from "@/lib/printFilter";
import PalmTreePrint from "./PalmTreePrint";
import ManuscriptPrint from "./ManuscriptPrint";
import BookPrint from "./BookPrint";
import PosterPrint from "./PosterPrint";
import MapPrint from "./MapPrint";
import ClanPrint from "./ClanPrint";
import OccasionsPrint from "./OccasionsPrint";
import OrnatePrint from "./OrnatePrint";
import FanChartPrint from "./FanChartPrint";
import SunRingPrint from "./SunRingPrint";
import ClassicTreePrint from "./ClassicTreePrint";
import PedigreeRollPrint from "./PedigreeRollPrint";
import HeritageBoardPrint from "./HeritageBoardPrint";

const RENDERERS: Record<PrintTemplateId, ComponentType<PrintTemplateProps>> = {
  palm: PalmTreePrint,
  manuscript: ManuscriptPrint,
  book: BookPrint,
  poster: PosterPrint,
  map: MapPrint,
  clan: ClanPrint,
  occasions: OccasionsPrint,
  ornate: OrnatePrint,
  fan: FanChartPrint,
  sun: SunRingPrint,
  classic: ClassicTreePrint,
  pedigree: PedigreeRollPrint,
  heritage: HeritageBoardPrint,
};

/** قوالب تُفضّل صفحة واحدة كاملة (مخطط بصري) */
const SINGLE_PAGE_TEMPLATES = new Set<PrintTemplateId>([
  "sun",
  "fan",
  "palm",
  "classic",
  "ornate",
  "heritage",
  "poster",
  "map",
  "clan",
  "manuscript",
]);

export default function PrintTemplateBody(props: PrintTemplateProps & { templateId: PrintTemplateId }) {
  const { templateId, ...rest } = props;
  const Component = RENDERERS[templateId];
  return <Component {...rest} />;
}

export function defaultPaperForTemplate(templateId: PrintTemplateId): PrintPaperSize {
  if (templateId === "book" || templateId === "occasions") return "A4-portrait";
  if (templateId === "poster" || templateId === "sun") return "A3-landscape";
  return "A4-landscape";
}

export function printOrient(paperSize: PrintPaperSize): "landscape" | "portrait" {
  return paperSize.endsWith("portrait") ? "portrait" : "landscape";
}

export function printPageCss(
  templateId: PrintTemplateId,
  paperSize: PrintPaperSize = defaultPaperForTemplate(templateId),
): string {
  const paper = PRINT_PAPER_SIZES[paperSize];
  const chartMax = paper.chartMax;
  const singlePage = SINGLE_PAGE_TEMPLATES.has(templateId);
  const printableW = paper.widthMm - 2 * parseFloat(paper.margin);
  const printableH = paper.heightMm - 2 * parseFloat(paper.margin);

  return `
    @media print {
      .no-print { display: none !important; }
      html, body {
        background: white !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        margin: 0 !important;
        padding: 0 !important;
        ${
          singlePage
            ? `
        width: ${paper.widthMm}mm !important;
        height: ${paper.heightMm}mm !important;
        overflow: hidden !important;
        `
            : `
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        `
        }
      }
      ${
        singlePage
          ? `
      #root, #root > * {
        overflow: hidden !important;
      }
      .print-sheet {
        box-shadow: none !important;
        width: ${printableW}mm !important;
        max-width: ${printableW}mm !important;
        height: ${printableH}mm !important;
        max-height: ${printableH}mm !important;
        margin: 0 auto !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: inherit !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
        page-break-before: avoid !important;
      }
      `
          : `
      .print-sheet {
        box-shadow: none !important;
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: visible !important;
        max-height: none !important;
        height: auto !important;
        background: inherit !important;
      }
      `
      }
      .print-family-chart,
      .chart-print-viewport {
        overflow: hidden !important;
        max-width: 100% !important;
        width: 100% !important;
        max-height: ${chartMax} !important;
      }
      .chart-print-content {
        max-width: none !important;
      }
      .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }

      .sun-mh-print,
      .print-fan-root,
      .print-palm,
      .print-palm-chart-wrap,
      .print-family-chart {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .sun-mh-print {
        display: flex !important;
        flex-direction: column !important;
        width: 100% !important;
        max-width: 100% !important;
        height: 100% !important;
        max-height: 100% !important;
        overflow: hidden !important;
        margin: 0 auto !important;
        min-height: 0 !important;
      }
      .sun-family-doc-header {
        flex: 0 0 auto !important;
        margin-bottom: 1mm !important;
        max-height: none !important;
        overflow: visible !important;
      }
      .sun-family-doc-header h1 {
        font-size: 10pt !important;
        line-height: 1.15 !important;
      }
      .sun-family-doc-header .sun-lineage-title {
        font-size: 9pt !important;
        line-height: 1.2 !important;
        margin-top: 0.4mm !important;
      }
      .sun-family-doc-header .print-stats-bar {
        margin-top: 0.8mm !important;
        gap: 1mm !important;
      }
      .sun-family-doc-header .print-stats-bar > span {
        padding: 0.4mm 1.2mm !important;
        font-size: 7pt !important;
      }
      .sun-family-doc-footer {
        flex: 0 0 auto !important;
        margin-top: 0.8mm !important;
        overflow: visible !important;
      }
      .sun-family-doc-footer p:last-child {
        display: none !important; /* أخفِ تلميح الجودة عند الطباعة الفعلية */
      }
      .sun-mh-print > .sun-family-frame {
        flex: 1 1 auto !important;
        min-height: 0 !important;
        width: auto !important;
        max-width: min(100%, ${chartMax}) !important;
        max-height: min(100%, calc(${chartMax} - 2mm)) !important;
        height: auto !important;
        aspect-ratio: 1 / 1 !important;
        margin: 0 auto !important;
        overflow: hidden !important;
        box-shadow: inset 0 0 0 0.4mm #D4C4A8 !important;
      }
      .print-fan-stage {
        position: relative !important;
        width: 100% !important;
        max-width: 100% !important;
        max-height: ${chartMax} !important;
        aspect-ratio: 16 / 10 !important;
        min-height: 0 !important;
        overflow: hidden !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .print-palm-svg,
      .print-sun-svg,
      .print-fan-svg {
        overflow: hidden !important;
        width: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        height: 100% !important;
        display: block !important;
        margin: 0 auto !important;
        shape-rendering: geometricPrecision !important;
        text-rendering: optimizeLegibility !important;
      }
      /* خطوط واضحة عند التكبير — خطوط نظام تُضمَّن جيداً في PDF */
      .print-palm-svg text,
      .print-sun-svg text,
      .print-fan-svg text {
        font-family: Tahoma, 'Segoe UI', 'Noto Naskh Arabic', 'Traditional Arabic', Arial, sans-serif !important;
        stroke: none !important;
        paint-order: normal !important;
      }
      .sun-chart-legend {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .print-sheet .rounded-full { overflow: hidden !important; }
      .twin-badge {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        background: #7c3aed !important;
        color: #fff !important;
      }
      .print-book-cover {
        max-width: 100% !important;
        margin-inline: auto !important;
        box-shadow: none !important;
        overflow: hidden !important;
      }
      .print-sheet > *:first-child {
        break-before: avoid !important;
        page-break-before: avoid !important;
      }
      ${
        singlePage
          ? `
      /* صفحة واحدة فقط — لا تمديد لصفحات إضافية */
      .print-sheet * {
        break-before: avoid !important;
        page-break-before: avoid !important;
      }
      `
          : ""
      }
      @page {
        size: ${paper.css};
        margin: ${paper.margin};
      }
    }

    /* شاشة المعاينة: خطوط أوضح */
    .print-sun-svg text,
    .print-fan-svg text,
    .print-palm-svg text {
      font-family: Tahoma, 'Segoe UI', 'Noto Naskh Arabic', 'Traditional Arabic', Arial, sans-serif;
    }
  `;
}
