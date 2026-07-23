import type { PrintTemplateDef, PrintTemplateId } from "./types";

export const PRINT_TEMPLATES: PrintTemplateDef[] = [
  { id: "palm", accent: "#0F5132", paper: "#f0f7ed", pageSize: "A3", orientation: "landscape" },
  { id: "manuscript", accent: "#B8860B", paper: "#faf6eb", pageSize: "A3", orientation: "landscape" },
  { id: "book", accent: "#5B3A29", paper: "#fffdf8", pageSize: "A4", orientation: "portrait" },
  { id: "poster", accent: "#1d4ed8", paper: "#ffffff", pageSize: "A0", orientation: "portrait" },
  { id: "map", accent: "#37526B", paper: "#eef5f8", pageSize: "A3", orientation: "landscape" },
  { id: "clan", accent: "#8B4513", paper: "#faf5ef", pageSize: "A3", orientation: "landscape" },
  { id: "occasions", accent: "#9d174d", paper: "#fdf5f8", pageSize: "A4", orientation: "portrait" },
  { id: "ornate", accent: "#0F5132", paper: "#f8f5ec", pageSize: "A3", orientation: "landscape" },
  { id: "fan", accent: "#0F5132", paper: "#f8faf8", pageSize: "A3", orientation: "landscape" },
  { id: "sun", accent: "#9FD5EB", paper: "#FDF9EF", pageSize: "A0", orientation: "landscape" },
  { id: "classic", accent: "#1e40af", paper: "#ffffff", pageSize: "A3", orientation: "landscape" },
  { id: "pedigree", accent: "#7c2d12", paper: "#fffbf7", pageSize: "A3", orientation: "landscape" },
  { id: "heritage", accent: "#92400e", paper: "#faf6f0", pageSize: "A3", orientation: "landscape" },
];

export function getPrintTemplate(id: PrintTemplateId): PrintTemplateDef {
  return PRINT_TEMPLATES.find((t) => t.id === id) ?? PRINT_TEMPLATES[0];
}
