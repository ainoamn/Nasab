import { describe, expect, it } from "vitest";
import {
  parsePersonIdParam,
  parseChartViewParam,
  parseMainTabParam,
  buildTreePersonPath,
  buildSharePersonPath,
  buildPrintRootPath,
  buildPrintTemplatePath,
} from "@/lib/treeUrl";

describe("parsePersonIdParam", () => {
  it("accepts positive integers", () => {
    expect(parsePersonIdParam("12")).toBe(12);
    expect(parsePersonIdParam("12.9")).toBe(12);
  });

  it("rejects empty invalid and non-positive", () => {
    expect(parsePersonIdParam(null)).toBeNull();
    expect(parsePersonIdParam("")).toBeNull();
    expect(parsePersonIdParam("0")).toBeNull();
    expect(parsePersonIdParam("-3")).toBeNull();
    expect(parsePersonIdParam("abc")).toBeNull();
  });
});

describe("parseChartViewParam", () => {
  it("accepts known views", () => {
    expect(parseChartViewParam("pedigree")).toBe("pedigree");
    expect(parseChartViewParam("fan")).toBe("fan");
  });

  it("rejects unknown", () => {
    expect(parseChartViewParam("map")).toBeNull();
    expect(parseChartViewParam(null)).toBeNull();
  });
});

describe("parseMainTabParam", () => {
  it("accepts main tabs only", () => {
    expect(parseMainTabParam("list")).toBe("list");
    expect(parseMainTabParam("admin")).toBeNull();
  });
});

describe("path builders", () => {
  it("omits default family view and chart tab", () => {
    expect(buildTreePersonPath(5, 9)).toBe("/trees/5?person=9");
    expect(buildTreePersonPath(5, 9, { view: "family", tab: "chart" })).toBe(
      "/trees/5?person=9",
    );
  });

  it("includes view tab and relate when set", () => {
    expect(
      buildTreePersonPath(5, 9, { view: "fan", tab: "list", relate: 3 }),
    ).toBe("/trees/5?person=9&view=fan&tab=list&relate=3");
  });

  it("builds share and print paths", () => {
    expect(buildSharePersonPath("tok", 4)).toBe("/share/tok?person=4");
    expect(buildSharePersonPath("tok", 4, { relate: 8 })).toBe(
      "/share/tok?person=4&relate=8",
    );
    expect(buildPrintRootPath(2, 11)).toBe("/trees/2/print?root=11");
    expect(buildPrintRootPath(2, 11, { template: "palm" })).toBe(
      "/trees/2/print?root=11&template=palm",
    );
    expect(buildPrintTemplatePath(2, "fan")).toBe(
      "/trees/2/print?template=fan",
    );
  });
});
