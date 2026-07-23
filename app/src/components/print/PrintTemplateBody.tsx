import type { ComponentType, CSSProperties } from "react";
import type { PrintTemplateId, PrintTemplateProps } from "./types";
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

export default function PrintTemplateBody(props: PrintTemplateProps & { templateId: PrintTemplateId }) {
  const { templateId, ...rest } = props;
  const Component = RENDERERS[templateId];
  return <Component {...rest} />;
}

export function printPageCss(templateId: PrintTemplateId): string {
  const sizes: Record<PrintTemplateId, string> = {
    palm: "A3 landscape",
    manuscript: "A3 landscape",
    book: "A4 portrait",
    poster: "A0 portrait",
    map: "A3 landscape",
    clan: "A3 landscape",
    occasions: "A4 portrait",
    ornate: "A3 landscape",
    fan: "A3 landscape",
    sun: "A0 landscape",
    classic: "A3 landscape",
    pedigree: "A3 landscape",
    heritage: "A3 landscape",
  };
  return `
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-sheet {
        box-shadow: none !important;
        max-width: 100% !important;
        width: 100% !important;
        overflow: visible !important;
      }
      .print-sheet * { overflow: visible !important; }
      .print\\:break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
      svg { overflow: visible !important; }
      .print-palm-svg text { font-family: 'Noto Naskh Arabic', 'Traditional Arabic', serif; }
      .print-palm { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-sun-svg text { font-family: 'Noto Naskh Arabic', 'Traditional Arabic', 'DejaVu Sans', Tahoma, sans-serif; }
      .sun-mh-print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { size: ${sizes[templateId]}; margin: ${templateId === "sun" ? "6mm" : "10mm"}; }
    }
  `;
}
