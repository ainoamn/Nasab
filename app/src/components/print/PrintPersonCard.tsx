import type { Person } from "@db/schema";
import { cn } from "@/lib/utils";
import { formatBirthYear, fullNasabName, generationColor, displayGenerationNumber } from "@/lib/printData";

type Variant = "classic" | "fan" | "pedigree" | "compact";

export function PrintPersonCard({
  person,
  laqabFallback,
  genLevel,
  variant = "classic",
  className,
}: {
  person: Person;
  laqabFallback?: string | null;
  genLevel?: number;
  variant?: Variant;
  className?: string;
}) {
  const female = person.gender === "female";
  const living = person.isLiving === true || (person.isLiving as unknown) === 1;
  const birth = formatBirthYear(person);
  const accent =
    genLevel != null ? generationColor(genLevel) : female ? "#9d174d" : "#1d4ed8";

  const barColor = !living ? (female ? "#831843" : "#1e3a8a") : accent;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-md border bg-white px-2 py-1 text-center shadow-sm min-w-[4.5rem] max-w-[6.5rem]",
          className,
        )}
        style={{ borderColor: `${barColor}66` }}
      >
        <div className="h-1 rounded-full mb-1" style={{ backgroundColor: barColor }} />
        <p className="font-display text-[9px] sm:text-[10px] font-bold leading-tight truncate">
          {person.givenName}
        </p>
        {birth && <p className="text-[8px] text-stone-500">{birth}</p>}
      </div>
    );
  }

  if (variant === "fan") {
    return (
      <div
        className={cn(
          "rounded-lg border-2 bg-white shadow-md text-center overflow-hidden min-w-[5rem] max-w-[7rem]",
          className,
        )}
        style={{ borderColor: barColor }}
      >
        <div className="h-1.5" style={{ backgroundColor: barColor }} />
        <div className="px-1.5 py-1">
          <p className="font-display text-[9px] sm:text-[10px] font-bold leading-tight line-clamp-2">
            {fullNasabName(person, laqabFallback)}
          </p>
          {birth && <p className="text-[8px] text-stone-500 mt-0.5">{birth}</p>}
          <p className="text-[7px] text-stone-400 mt-0.5">{female ? "♀" : "♂"}</p>
        </div>
      </div>
    );
  }

  if (variant === "pedigree") {
    return (
      <div
        className={cn(
          "rounded-lg border bg-white shadow-sm overflow-hidden w-full max-w-[11rem]",
          className,
        )}
        style={{ borderColor: `${barColor}88` }}
      >
        <div className="flex">
          <div className="w-1 shrink-0" style={{ backgroundColor: barColor }} />
          <div className="px-2 py-1.5 min-w-0 flex-1">
            <p className="font-display text-xs font-bold leading-snug break-words">
              {fullNasabName(person, laqabFallback)}
            </p>
            {birth && <p className="text-[10px] text-stone-500 mt-0.5">{birth}</p>}
            {person.birthPlace && (
              <p className="text-[9px] text-stone-400 truncate">{person.birthPlace}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // classic — MyHeritage-style box
  return (
    <div
      className={cn(
        "rounded-xl border-2 bg-white shadow-md overflow-hidden min-w-[6.5rem] max-w-[9rem]",
        className,
      )}
      style={{ borderColor: barColor }}
    >
      <div
        className="px-2 py-0.5 text-[8px] text-white text-center font-medium"
        style={{ backgroundColor: barColor }}
      >
        {genLevel != null
          ? genLevel < 0
            ? `↑${Math.abs(genLevel)}`
            : `${displayGenerationNumber(genLevel)}`
          : female
            ? "♀"
            : "♂"}
        {!living && " · متوفى"}
      </div>
      <div className="px-2 py-2 text-center">
        <p className="font-display text-xs font-bold leading-tight">
          {person.givenName}
        </p>
        {person.fatherName && (
          <p className="text-[10px] text-stone-600 font-display mt-0.5">{person.fatherName}</p>
        )}
        {(person.laqab || laqabFallback) && (
          <p className="text-[9px] text-stone-400 mt-0.5">{person.laqab || laqabFallback}</p>
        )}
        {birth && <p className="text-[9px] text-stone-500 mt-1">{birth}</p>}
      </div>
    </div>
  );
}
