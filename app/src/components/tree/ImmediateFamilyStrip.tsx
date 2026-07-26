import { useTranslation } from "react-i18next";
import type { Person } from "@db/tables";
import { cn } from "@/lib/utils";

type Member = {
  person: Person;
  role: "father" | "mother" | "spouse" | "child" | "sibling";
};

type Props = {
  members: Member[];
  onSelect: (person: Person) => void;
  className?: string;
};

function AvatarChip({
  person,
  roleLabel,
  onClick,
}: {
  person: Person;
  roleLabel: string;
  onClick: () => void;
}) {
  const female = person.gender === "female";
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-xl p-1.5 hover:bg-white/80"
      title={`${person.givenName} — ${roleLabel}`}
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
    </button>
  );
}

/** شريط صور العائلة المباشرة في لوحة التفاصيل — تنقّل بنقرة */
export default function ImmediateFamilyStrip({
  members,
  onSelect,
  className,
}: Props) {
  const { t } = useTranslation();
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
            onClick={() => onSelect(m.person)}
          />
        ))}
      </div>
    </div>
  );
}
