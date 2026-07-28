import { describe, expect, it } from "vitest";
import type { Person, Relationship, TreeBranch } from "@db/tables";
import { bankTransferAdapter } from "../../server/payments/offline";
import { PRINT_TEMPLATES } from "@/components/print/registry";
import {
  assignGenerationsStable,
  computePrintStats,
  computeSunLayout,
  buildPalmTreeLayout,
} from "@/lib/printData";
import { buildPrintSubgraph, DEFAULT_PRINT_SCOPE } from "@/lib/printFilter";
import { collectFocusedSubgraph, getParents } from "@/lib/familyGraph";
import { parseLineageChain } from "@/lib/lineageParser";

function person(
  id: number,
  givenName: string,
  gender: "male" | "female" = "male",
  fatherName: string | null = null,
): Person {
  return {
    id,
    treeId: 1,
    givenName,
    fatherName,
    kunya: null,
    laqab: null,
    clan: null,
    gender,
    birthDay: null,
    birthMonth: null,
    birthYear: null,
    birthPlace: null,
    deathDay: null,
    deathMonth: null,
    deathYear: null,
    deathPlace: null,
    isLiving: true,
    privacy: "family",
    photoUrl: null,
    notes: null,
    branchId: null,
    twinGroupId: null,
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

function parent(from: number, to: number): Relationship {
  return {
    id: from * 100 + to,
    treeId: 1,
    fromPersonId: from,
    toPersonId: to,
    type: "parent",
    marriageDay: null,
    marriageMonth: null,
    marriageYear: null,
    divorceDay: null,
    divorceMonth: null,
    divorceYear: null,
    createdAt: new Date(),
  };
}

function spouse(a: number, b: number): Relationship {
  return {
    id: a * 1000 + b,
    treeId: 1,
    fromPersonId: a,
    toPersonId: b,
    type: "spouse",
    marriageDay: null,
    marriageMonth: null,
    marriageYear: null,
    divorceDay: null,
    divorceMonth: null,
    divorceYear: null,
    createdAt: new Date(),
  };
}

describe("launch smoke: print templates", () => {
  it("has all templates and layout engines run", () => {
    expect(PRINT_TEMPLATES.map((t) => t.id)).toEqual(
      expect.arrayContaining([
        "palm",
        "sun",
        "classic",
        "pedigree",
        "fan",
        "heritage",
      ]),
    );
    expect(PRINT_TEMPLATES.length).toBeGreaterThanOrEqual(10);

    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "ابن"),
      person(4, "زوجة", "female"),
    ];
    const rels = [parent(1, 2), parent(2, 3), spouse(2, 4)];
    const levels = assignGenerationsStable(people, rels);
    const stats = computePrintStats(people, levels, rels);
    expect(stats.total).toBe(4);

    const palm = buildPalmTreeLayout(people, rels, levels, 1);
    expect(palm.founder?.id).toBe(1);
    expect(palm.fronds.length).toBeGreaterThan(0);

    const sun = computeSunLayout(people, rels, levels, 1);
    expect(sun.positions.size).toBeGreaterThan(0);
    expect(sun.ringCount).toBeGreaterThan(0);
  });
});

describe("launch smoke: wives + lineage", () => {
  it("parses wife fatherName lineage segments", () => {
    const parsed = parseLineageChain("سعود بن حمد بن راشد");
    expect(parsed.segments.length).toBeGreaterThanOrEqual(2);
    expect(parsed.segments[0]?.givenName).toBeTruthy();
  });

  it("focus on child includes father, mother, and paternal grandfather", () => {
    const people = [
      person(1, "جد"),
      person(2, "أب"),
      person(3, "أم", "female", "سعود بن حمد"),
      person(4, "ابن"),
      person(5, "زوجة2", "female"),
    ];
    const rels = [
      parent(1, 2),
      parent(2, 4),
      parent(3, 4),
      spouse(2, 3),
      spouse(2, 5),
    ];
    const parents = getParents(4, rels, new Map(people.map((p) => [p.id, p])));
    expect(parents.fatherId).toBe(2);
    expect(parents.motherId).toBe(3);

    const sub = collectFocusedSubgraph(4, people, rels);
    const ids = new Set(sub.people.map((p) => p.id));
    expect(ids.has(1)).toBe(true);
    expect(ids.has(2)).toBe(true);
    expect(ids.has(3)).toBe(true);

    const branches: TreeBranch[] = [];
    const printSub = buildPrintSubgraph(people, rels, branches, {
      ...DEFAULT_PRINT_SCOPE,
      rootPersonId: 2,
    });
    expect(printSub.people.length).toBeGreaterThan(0);
  });
});

describe("launch smoke: bank transfer checkout", () => {
  it("builds offline payment instructions with bank details", async () => {
    const result = await bankTransferAdapter.createCheckout(
      {
        bankName: "بنك مسقط",
        accountName: "شركة نَسَب",
        accountNumber: "1234567890",
        iban: "OM000000000000000000000000",
        instructions: "أرفق إيصال التحويل",
      },
      {
        invoiceNumber: "INV-TEST-1",
        invoiceId: 1,
        amount: 9900,
        currency: "OMR",
        description: "اشتراك",
        planSlug: "plus",
        origin: "https://example.com",
        user: {
          id: 1,
          name: "اختبار",
          email: "a@b.c",
          billingEmail: null,
          plan: "free",
        },
        metadata: {
          planSlug: "plus",
          context: "new",
          originalAmount: 9900,
          discountApplied: 0,
        },
      },
      false,
    );
    expect(result.kind).toBe("offline");
    expect(result.instructions).toContain("بنك مسقط");
    expect(result.instructions).toContain("INV-TEST-1");
    expect(result.instructions).toContain("9.900");
  });
});
