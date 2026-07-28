import type { Person, Relationship } from "@db/schema";

export type BirthParts = {
  birthDay?: number | null;
  birthMonth?: number | null;
  birthYear?: number | null;
};

/** مفتاح ترتيب بالميلاد — من ليس له تاريخ يأتي آخراً */
export function birthSortKey(p: BirthParts): number {
  const y = p.birthYear ?? 9999;
  const m = p.birthMonth ?? 12;
  const d = p.birthDay ?? 31;
  return y * 10000 + m * 100 + d;
}

type BirthSortable = BirthParts & { id?: number | string | null };

/**
 * ترتيب مستقر بالميلاد ثم بالمعرّف — يمنع تقلب ترتيب التوائم
 * الذين يشتركون في نفس تاريخ الميلاد.
 */
export function comparePeopleByBirth(a: BirthSortable, b: BirthSortable): number {
  const byBirth = birthSortKey(a) - birthSortKey(b);
  if (byBirth !== 0) return byBirth;
  return Number(a.id ?? 0) - Number(b.id ?? 0);
}

export function formatBirthDate(
  p: BirthParts,
  locale = "ar-OM",
): string | null {
  if (!p.birthYear) return null;
  if (p.birthDay && p.birthMonth) {
    try {
      return new Date(
        p.birthYear,
        p.birthMonth - 1,
        p.birthDay,
      ).toLocaleDateString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return `${p.birthDay}/${p.birthMonth}/${p.birthYear}`;
    }
  }
  if (p.birthMonth) return `${p.birthMonth}/${p.birthYear}`;
  return String(p.birthYear);
}

export type PersonRanks = {
  /** ترتيب بين إخوته من نفس الأب (1 = الأكبر) */
  amongSiblings: number | null;
  siblingsTotal: number;
  /** ترتيب بين الذكور أو الإناث فقط من نفس الأب */
  amongSameGender: number | null;
  sameGenderTotal: number;
  /** ترتيب بين كل الذكور أو الإناث في الشجرة */
  amongGenderInTree: number | null;
  genderInTreeTotal: number;
  /** ترتيب بين أحفاد الجد (من جهة الأب) */
  amongCousins: number | null;
  cousinsTotal: number;
};

function parentsOf(
  personId: number,
  rels: Relationship[],
): number[] {
  return rels
    .filter((r) => r.type === "parent" && r.toPersonId === personId)
    .map((r) => r.fromPersonId);
}

function childrenOf(
  parentId: number,
  rels: Relationship[],
): number[] {
  return rels
    .filter((r) => r.type === "parent" && r.fromPersonId === parentId)
    .map((r) => r.toPersonId);
}

function rankInList(list: Person[], id: number): { rank: number; total: number } | null {
  if (list.length === 0) return null;
  const sorted = [...list].sort(comparePeopleByBirth);
  const idx = sorted.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  return { rank: idx + 1, total: sorted.length };
}

/**
 * يحسب تسلسل الشخص بين إخوته، وبين نفس الجنس، وبين أحفاد جده.
 */
export function computePersonRanks(
  person: Person,
  people: Person[],
  rels: Relationship[],
): PersonRanks {
  const byId = new Map(people.map((p) => [p.id, p]));
  const empty: PersonRanks = {
    amongSiblings: null,
    siblingsTotal: 0,
    amongSameGender: null,
    sameGenderTotal: 0,
    amongGenderInTree: null,
    genderInTreeTotal: 0,
    amongCousins: null,
    cousinsTotal: 0,
  };

  const parentIds = parentsOf(person.id, rels);
  const fatherId =
    parentIds.find((id) => byId.get(id)?.gender === "male") ?? parentIds[0];

  if (!fatherId) return empty;

  const siblingIds = childrenOf(fatherId, rels);
  const siblings = siblingIds
    .map((id) => byId.get(id))
    .filter((p): p is Person => !!p);

  const sibRank = rankInList(siblings, person.id);
  const sameGender = siblings.filter((p) => p.gender === person.gender);
  const genderRank = rankInList(sameGender, person.id);

  const allSameGenderInTree = people.filter((p) => p.gender === person.gender);
  const treeGenderRank = rankInList(allSameGenderInTree, person.id);

  // الجد من جهة الأب
  const grandParentIds = parentsOf(fatherId, rels);
  const grandfatherId =
    grandParentIds.find((id) => byId.get(id)?.gender === "male") ??
    grandParentIds[0];

  let cousinsRank: { rank: number; total: number } | null = null;
  if (grandfatherId) {
    const uncleGeneration = childrenOf(grandfatherId, rels);
    const cousinIds = new Set<number>();
    for (const uncleId of uncleGeneration) {
      for (const cid of childrenOf(uncleId, rels)) cousinIds.add(cid);
    }
    const cousins = [...cousinIds]
      .map((id) => byId.get(id))
      .filter((p): p is Person => !!p);
    cousinsRank = rankInList(cousins, person.id);
  }

  return {
    amongSiblings: sibRank?.rank ?? null,
    siblingsTotal: sibRank?.total ?? 0,
    amongSameGender: genderRank?.rank ?? null,
    sameGenderTotal: genderRank?.total ?? 0,
    amongGenderInTree: treeGenderRank?.rank ?? null,
    genderInTreeTotal: treeGenderRank?.total ?? 0,
  amongCousins: cousinsRank?.rank ?? null,
  cousinsTotal: cousinsRank?.total ?? 0,
  };
}

export type AgeParts = {
  birthDay?: number | null;
  birthMonth?: number | null;
  birthYear?: number | null;
  deathDay?: number | null;
  deathMonth?: number | null;
  deathYear?: number | null;
  isLiving?: boolean | null;
};

/** عمر للأحياء، أو مدى حياة للمتوفين — للعرض المختصر على البطاقات */
export function formatAgeOrLifespan(
  p: AgeParts,
  now = new Date(),
): string | null {
  if (!p.birthYear) return null;

  if (p.isLiving === false) {
    if (p.deathYear) return `${p.birthYear}–${p.deathYear}`;
    return String(p.birthYear);
  }

  let age = now.getFullYear() - p.birthYear;
  if (p.birthMonth != null) {
    const bm = p.birthMonth;
    const bd = p.birthDay ?? 1;
    const hadBirthday =
      now.getMonth() + 1 > bm ||
      (now.getMonth() + 1 === bm && now.getDate() >= bd);
    if (!hadBirthday) age -= 1;
  }
  if (age < 0) return null;
  return String(age);
}

/** ترتيب مختصر بين الإخوة: «٢/٥» — أو تمييز التوأم */
export function formatSiblingOrdinal(
  ranks: Pick<PersonRanks, "amongSiblings" | "siblingsTotal">,
): string | null {
  if (!ranks.amongSiblings || ranks.siblingsTotal < 2) return null;
  return `${ranks.amongSiblings}/${ranks.siblingsTotal}`;
}

/** ترتيب مع تمييز التوأم — يُستخدم في الواجهة */
export function formatSiblingLabel(
  person: Person,
  people: Person[],
  ranks: Pick<PersonRanks, "amongSiblings" | "siblingsTotal">,
  twinLabel: string,
): string | null {
  if (person.twinGroupId != null) {
    const group = people.filter((p) => p.twinGroupId === person.twinGroupId);
    if (group.length >= 2) {
      const sorted = [...group].sort(comparePeopleByBirth);
      const idx = sorted.findIndex((p) => p.id === person.id);
      if (idx >= 0) {
        return `${twinLabel} ${idx + 1}/${group.length}`;
      }
    }
  }
  return formatSiblingOrdinal(ranks);
}

