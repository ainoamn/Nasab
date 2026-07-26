import { cn } from "@/lib/utils";
import type { Person } from "@db/tables";

type Props = {
  person: Person | null;
  years?: string | null;
  selected?: boolean;
  placeholder?: string;
  onClick?: () => void;
  className?: string;
};

/** كبسولة أفقية بأسلوب مخطط الأسلاف (MyHeritage pedigree) */
export function MhPersonPill({
  person,
  years,
  selected,
  placeholder,
  onClick,
  className,
}: Props) {
  if (!person) {
    return (
      <div
        className={cn(
          "flex h-12 w-[11.5rem] items-center gap-2 rounded-full border border-dashed border-stone-300 bg-white/70 px-3 text-xs text-stone-400",
          className,
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-stone-300 text-base text-stone-300">
          +
        </span>
        <span className="truncate">{placeholder ?? "—"}</span>
      </div>
    );
  }

  const female = person.gender === "female";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-[11.5rem] items-center gap-2 rounded-full border px-2 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        female
          ? "border-pink-200 bg-[#fce8f1]"
          : "border-sky-200 bg-[#e3f0fb]",
        selected && "ring-2 ring-sky-500 ring-offset-1",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white ring-2",
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
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 19.5c0-3.4 3.1-5.5 7-5.5s7 2.1 7 5.5" />
            </svg>
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-stone-900">
          {person.givenName}
        </span>
        {years && (
          <span className="block truncate text-[10px] text-stone-500">{years}</span>
        )}
      </span>
    </button>
  );
}
