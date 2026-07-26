import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import {
  computePersonRanks,
  formatAgeOrLifespan,
  formatSiblingOrdinal,
} from "@/lib/birthOrder";
import { cn } from "@/lib/utils";

type Member = {
  person: Person;
  role: "father" | "mother" | "spouse" | "child" | "sibling";
};

type Props = {
  members: Member[];
  people?: Person[];
  rels?: Relationship[];
  onSelect: (person: Person) => void;
  className?: string;
};

function AvatarChip({
  person,
  roleLabel,
  meta,
  onClick,
}: {
  person: Person;
  roleLabel: string;
  meta?: string | null;
  onClick: () => void;
}) {
  const female = person.gender === "female";
  const title = meta
    ? `${person.givenName} — ${roleLabel} · ${meta}`
    : `${person.givenName} — ${roleLabel}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-white/80"
      title={title}
    >
      <span
        className={cn(
          "flex h-12 w-12 overflow-hidden rounded-full bg-white ring-2 shadow-sm transition group-hover:scale-105",
          female ? "ring-pink-300" : "ring-sky-300",
        )}
      >
        {person.photoUrl ? (
          <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className={cn(
              "flex h-full w-full items-center justify-center text-white",
              female ? "bg-pink-500" : "bg-sky-600",
            )}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 19.5c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5" />
            </svg>
          </span>
        )}
      </span>
      <span className="w-full truncate text-center text-[11px] font-medium leading-tight text-stone-900">
        {person.givenName}
      </span>
      <span className="w-full truncate text-center text-[9px] text-muted-foreground">
        {roleLabel}
      </span>
      {meta && (
        <span className="w-full truncate text-center text-[9px] font-medium tabular-nums text-sky-800/80">
          {meta}
        </span>
      )}
    </button>
  );
}

/** شريط صور العائلة المباشرة — مع عمر/مدى حياة وترتيب الإخوة */
export default function ImmediateFamilyStrip({
  members,
  people,
  rels,
  onSelect,
  className,
}: Props) {
  const { t } = useTranslation();

  const metaById = useMemo(() => {
    const map = new Map<number, string>();
    if (!people || !rels || members.length === 0) {
      for (const m of members) {
        const age = formatAgeOrLifespan(m.person);
        if (age) {
          map.set(
            m.person.id,
            m.person.isLiving
              ? t("detail.ageYears", { n: age })
              : age,
          );
        }
      }
      return map;
    }
    for (const m of members) {
      const parts: string[] = [];
      if (m.role === "sibling" || m.role === "child") {
        const ranks = computePersonRanks(m.person, people, rels);
        const ord = formatSiblingOrdinal(ranks);
        if (ord) parts.push(ord);
      }
      const age = formatAgeOrLifespan(m.person);
      if (age) {
        parts.push(
          m.person.isLiving ? t("detail.ageYears", { n: age }) : age,
        );
      }
      if (parts.length > 0) map.set(m.person.id, parts.join(" · "));
    }
    return map;
  }, [members, people, rels, t]);

  if (members.length === 0) return null;

  const roleKey = (role: Member["role"]) => {
    switch (role) {
      case "father":
        return t("detail.father");
      case "mother":
        return t("detail.mother");
      case "spouse":
        return t("detail.spouse");
      case "child":
        return t("detail.child");
      case "sibling":
        return t("detail.sibling");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-semibold">{t("detail.immediateFamily")}</p>
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {members.map((m) => (
          <AvatarChip
            key={`${m.role}-${m.person.id}`}
            person={m.person}
            roleLabel={roleKey(m.role)}
            meta={metaById.get(m.person.id)}
            onClick={() => onSelect(m.person)}
          />
        ))}
      </div>
    </div>
  );
}
