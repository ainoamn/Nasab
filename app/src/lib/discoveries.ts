import type { Person, Relationship } from "@db/tables";
import { buildChildrenOf, buildSpousesOf, getParents } from "@/lib/familyGraph";

export type DiscoveryKind =
  | "missingFather"
  | "missingMother"
  | "missingBothParents"
  | "childNoSpouseLink"
  | "noPhoto";

export type Discovery = {
  kind: DiscoveryKind;
  personId: number;
  personName: string;
};

/** اكتشافات جودة البيانات — أقرب لـ Discoveries في مواقع النسب */
export function findDiscoveries(
  people: Person[],
  rels: Relationship[],
  opts?: { includeNoPhoto?: boolean; limit?: number },
): Discovery[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const childrenOf = buildChildrenOf(rels);
  const spousesOf = buildSpousesOf(rels);
  const out: Discovery[] = [];
  const limit = opts?.limit ?? 40;

  for (const p of people) {
    const { fatherId, motherId } = getParents(p.id, rels, byId);
    const hasKids = (childrenOf.get(p.id) ?? []).length > 0;

    if (!fatherId && !motherId && hasKids) {
      out.push({
        kind: "missingBothParents",
        personId: p.id,
        personName: p.givenName,
      });
    } else if (!fatherId && motherId) {
      out.push({
        kind: "missingFather",
        personId: p.id,
        personName: p.givenName,
      });
    } else if (fatherId && !motherId) {
      out.push({
        kind: "missingMother",
        personId: p.id,
        personName: p.givenName,
      });
    }

    // لديه أبناء لكن بلا زوج مسجّل
    if (hasKids && (spousesOf.get(p.id) ?? []).length === 0 && p.gender === "male") {
      out.push({
        kind: "childNoSpouseLink",
        personId: p.id,
        personName: p.givenName,
      });
    }

    if (opts?.includeNoPhoto && !p.photoUrl) {
      out.push({
        kind: "noPhoto",
        personId: p.id,
        personName: p.givenName,
      });
    }

    if (out.length >= limit) break;
  }

  return out.slice(0, limit);
}
