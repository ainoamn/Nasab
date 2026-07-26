import type { Person, Relationship } from "@db/tables";
import { buildChildrenOf, buildSpousesOf, getParents } from "@/lib/familyGraph";

export type DiscoveryKind =
  | "missingFather"
  | "missingMother"
  | "missingBothParents"
  | "childNoSpouseLink"
  | "noPhoto"
  | "deathBeforeBirth"
  | "childBeforeParent"
  | "possibleDuplicate"
  | "livingNoBirthYear";

export type Discovery = {
  kind: DiscoveryKind;
  personId: number;
  personName: string;
  /** للduplicates: الشخص الآخر */
  otherPersonId?: number;
  otherPersonName?: string;
};

function normName(s: string | null | undefined): string {
  return (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

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
  const seenDup = new Set<string>();

  // فهرس أسماء لاكتشاف التكرار المحتمل
  const byKey = new Map<string, Person[]>();
  for (const p of people) {
    const key = `${normName(p.givenName)}|${normName(p.fatherName)}`;
    if (!normName(p.givenName)) continue;
    const list = byKey.get(key) ?? [];
    list.push(p);
    byKey.set(key, list);
  }

  for (const p of people) {
    if (out.length >= limit) break;

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

    if (
      hasKids &&
      (spousesOf.get(p.id) ?? []).length === 0 &&
      p.gender === "male"
    ) {
      out.push({
        kind: "childNoSpouseLink",
        personId: p.id,
        personName: p.givenName,
      });
    }

    if (
      p.birthYear != null &&
      p.deathYear != null &&
      p.deathYear < p.birthYear
    ) {
      out.push({
        kind: "deathBeforeBirth",
        personId: p.id,
        personName: p.givenName,
      });
    }

    if (p.isLiving && p.birthYear == null && hasKids) {
      out.push({
        kind: "livingNoBirthYear",
        personId: p.id,
        personName: p.givenName,
      });
    }

    for (const parentId of [fatherId, motherId]) {
      if (parentId == null || p.birthYear == null) continue;
      const parent = byId.get(parentId);
      if (parent?.birthYear != null && p.birthYear < parent.birthYear) {
        out.push({
          kind: "childBeforeParent",
          personId: p.id,
          personName: p.givenName,
          otherPersonId: parent.id,
          otherPersonName: parent.givenName,
        });
        break;
      }
    }

    if (opts?.includeNoPhoto && !p.photoUrl) {
      out.push({
        kind: "noPhoto",
        personId: p.id,
        personName: p.givenName,
      });
    }
  }

  for (const [, group] of byKey) {
    if (out.length >= limit) break;
    if (group.length < 2) continue;
    const a = group[0];
    const b = group[1];
    const pairKey = [a.id, b.id].sort((x, y) => x - y).join("-");
    if (seenDup.has(pairKey)) continue;
    seenDup.add(pairKey);
    // تجاهل إن كان أحدهما أباً/أماً للآخر
    const { fatherId, motherId } = getParents(a.id, rels, byId);
    if (fatherId === b.id || motherId === b.id) continue;
    const bp = getParents(b.id, rels, byId);
    if (bp.fatherId === a.id || bp.motherId === a.id) continue;
    out.push({
      kind: "possibleDuplicate",
      personId: a.id,
      personName: a.givenName,
      otherPersonId: b.id,
      otherPersonName: b.givenName,
    });
  }

  return out.slice(0, limit);
}
