import { describe, expect, it } from "vitest";
import {
  applyNameMode,
  scopeSummaryLabel,
  type PrintScope,
} from "@/lib/printFilter";
import type { Person, TreeBranch } from "@db/tables";

function person(id: number, givenName: string, extras: Partial<Person> = {}): Person {
  return {
    id,
    treeId: 1,
    givenName,
    fatherName: "سعيد بن راشد",
    kunya: "أبو علي",
    laqab: "الفلاني",
    gender: "male",
    isLiving: true,
    ...extras,
  } as Person;
}

const baseScope: PrintScope = {
  rootPersonId: 1,
  branchId: 2,
  generationsDown: 4,
  includeParents: false,
  includeSpouses: true,
  includeSpouseLineage: true,
  femaleDisplay: "full",
  nameMode: "full",
  paperSize: "A4-landscape",
};

describe("applyNameMode", () => {
  it("keeps full names in full mode", () => {
    const p = person(1, "عبد الله محمد");
    expect(applyNameMode([p], "full")[0]?.fatherName).toBe("سعيد بن راشد");
  });

  it("shortens to first given name and clears lineage fields", () => {
    const p = person(1, "عبد الله محمد");
    const short = applyNameMode([p], "firstOnly")[0]!;
    expect(short.givenName).toBe("عبد");
    expect(short.fatherName).toBeNull();
    expect(short.kunya).toBeNull();
    expect(short.laqab).toBeNull();
  });
});

describe("scopeSummaryLabel", () => {
  it("joins branch root generations spouses and count", () => {
    const root = person(1, "جذر");
    const branch = { id: 2, name: "البطن" } as TreeBranch;
    const t = (k: string, o?: Record<string, unknown>) =>
      `${k}:${o?.name ?? o?.count ?? ""}`;
    const label = scopeSummaryLabel(baseScope, root, branch, 12, t);
    expect(label).toContain("printPage.scopeBranch:البطن");
    expect(label).toContain("printPage.scopeRoot:");
    expect(label).toContain("printPage.scopeGenerations:4");
    expect(label).toContain("printPage.scopeWithSpouses:");
    expect(label).toContain("printPage.scopeSpouseFamilies:");
    expect(label).toContain("printPage.scopePersonCount:12");
  });
});
