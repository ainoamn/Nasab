import type { Person } from "@db/schema";

/** نص عرض الشخص مع تمييز التكرار */
export function personDisplayLabel(
  person: Person,
  people: Person[],
  opts?: { showId?: boolean; notInChart?: boolean },
): string {
  const dupes =
    people.filter((p) => p.givenName === person.givenName).length > 1;
  const parts: string[] = [person.givenName];
  if (person.fatherName?.trim()) parts.push(`(${person.fatherName.trim()})`);
  if (person.kunya?.trim()) parts.push(`[${person.kunya.trim()}]`);
  if (dupes || opts?.showId) parts.push(`#${person.id}`);
  if (opts?.notInChart) parts.push("·");
  return parts.join(" ");
}

/** يطابق أي جزء من الاسم أو النسب أو الرقم */
export function personMatchesQuery(person: Person, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    person.givenName,
    person.fatherName,
    person.kunya,
    person.laqab,
    person.clan,
    person.id.toString(),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
