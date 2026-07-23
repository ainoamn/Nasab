import type { Person, Relationship } from "@db/schema";
import type { PrintTreeMeta } from "@/lib/printData";

export type PrintTemplateId =
  | "palm"
  | "manuscript"
  | "book"
  | "poster"
  | "map"
  | "clan"
  | "occasions"
  | "ornate"
  | "fan"
  | "sun"
  | "classic"
  | "pedigree"
  | "heritage";

export type PrintTemplateDef = {
  id: PrintTemplateId;
  accent: string;
  paper: string;
  pageSize: "A3" | "A4" | "A0";
  orientation: "landscape" | "portrait";
};

export type PrintTemplateProps = {
  tree: PrintTreeMeta;
  people: Person[];
  rels: Relationship[];
  levels: Map<number, number>;
  rootPersonId: number;
  scopeSummary: string;
  accent: string;
  paper: string;
  designName: string;
  today: string;
};
