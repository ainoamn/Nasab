import type { Person } from "@db/schema";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  formatBirthYear,
  fullNasabName,
  generationColor,
  displayGenerationNumber,
} from "@/lib/printData";
import TwinBadge from "@/components/tree/TwinBadge";

type Variant = "classic" | "fan" | "pedigree" | "compact";

export function PrintPersonCard({
  person,
  laqabFallback,
  genLevel,
  variant = "classic",
  className,
  twinOrder,
  twinTotal,
  spouseNotes,
}: {
  person: Person;
  laqabFallback?: string | null;
  genLevel?: number;
  variant?: Variant;
  className?: string;
  twinOrder?: number | null;
  twinTotal?: number | null;
  /** ملاحظات الزوج/الزوجة: «زوجة آسية» / «زوج أسعد» */
  spouseNotes?: string[];
}) {
  const { t } = useTranslation();
  const female = person.gender === "female";
  const living = person.isLiving === true || (person.isLiving as unknown) === 1;
  const birth = formatBirthYear(person);
  const accent =
    genLevel != null ? generationColor(genLevel) : female ? "#9d174d" : "#1d4ed8";

  const barColor = !living ? (female ? "#831843" : "#1e3a8a") : accent;
  const isTwinCard = twinOrder != null && twinTotal != null && twinTotal >= 2;
  const notesLine =
    spouseNotes && spouseNotes.length > 0 ? spouseNotes.join(" · ") : null;

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "relative rounded-md border bg-white px-2 py-1 text-center shadow-sm min-w-[4.5rem] max-w-[6.5rem]",
          isTwinCard && "border-violet-500 ring-1 ring-violet-300",
          className,
        )}
        style={{ borderColor: isTwinCard ? undefined : `${barColor}66` }}
      >
        {isTwinCard && (
          <span className="absolute -top-1 start-1/2 z-[1] -translate-x-1/2">
            <TwinBadge compact order={twinOrder} total={twinTotal} />
          </span>
        )}
        <div
          className="mb-1 h-1 rounded-full"
          style={{ backgroundColor: isTwinCard ? "#7c3aed" : barColor }}
        />
        <p className="truncate font-display text-[9px] font-bold leading-tight sm:text-[10px]">
          {person.givenName}
        </p>
        {notesLine && (
          <p className="truncate text-[7px] font-medium text-amber-800/90">{notesLine}</p>
        )}
        {birth && <p className="text-[8px] text-stone-500">{birth}</p>}
      </div>
    );
  }

  if (variant === "fan") {
    return (
      <div
        className={cn(
          "relative min-w-[5rem] max-w-[7rem] overflow-hidden rounded-lg border-2 bg-white text-center shadow-md",
          isTwinCard && "border-violet-600",
          className,
        )}
        style={{ borderColor: isTwinCard ? undefined : barColor }}
      >
        {isTwinCard && (
          <span className="absolute start-1 top-1 z-[1]">
            <TwinBadge compact order={twinOrder} total={twinTotal} />
          </span>
        )}
        <div
          className="h-1.5"
          style={{ backgroundColor: isTwinCard ? "#7c3aed" : barColor }}
        />
        <div className="px-1.5 py-1">
          <p className="line-clamp-2 font-display text-[9px] font-bold leading-tight sm:text-[10px]">
            {fullNasabName(person, laqabFallback)}
          </p>
          {notesLine && (
            <p className="mt-0.5 line-clamp-2 text-[7px] font-medium text-amber-800/90">
              {notesLine}
            </p>
          )}
          {birth && <p className="mt-0.5 text-[8px] text-stone-500">{birth}</p>}
          <p className="mt-0.5 text-[7px] text-stone-400">
            {female ? t("common.female") : t("common.male")}
          </p>
        </div>
      </div>
    );
  }

  if (variant === "pedigree") {
    return (
      <div
        className={cn(
          "w-full max-w-[11rem] overflow-hidden rounded-lg border bg-white shadow-sm",
          isTwinCard && "border-violet-500 ring-1 ring-violet-300",
          className,
        )}
        style={{ borderColor: isTwinCard ? undefined : `${barColor}88` }}
      >
        <div className="flex">
          <div
            className="w-1 shrink-0"
            style={{ backgroundColor: isTwinCard ? "#7c3aed" : barColor }}
          />
          <div className="min-w-0 flex-1 px-2 py-1.5">
            <div className="flex items-start gap-1">
              <p className="min-w-0 flex-1 break-words font-display text-xs font-bold leading-snug">
                {fullNasabName(person, laqabFallback)}
              </p>
              {isTwinCard && (
                <TwinBadge compact order={twinOrder} total={twinTotal} />
              )}
            </div>
            {notesLine && (
              <p className="mt-0.5 text-[10px] font-medium text-amber-800/90">{notesLine}</p>
            )}
            {birth && <p className="mt-0.5 text-[10px] text-stone-500">{birth}</p>}
            {person.birthPlace && (
              <p className="truncate text-[9px] text-stone-400">{person.birthPlace}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative min-w-[6.5rem] max-w-[9rem] overflow-hidden rounded-xl border-2 bg-white shadow-md",
        isTwinCard && "border-violet-600 ring-2 ring-violet-300",
        className,
      )}
      style={{ borderColor: isTwinCard ? undefined : barColor }}
    >
      {isTwinCard && (
        <span className="absolute end-1 top-1 z-[1]">
          <TwinBadge compact order={twinOrder} total={twinTotal} />
        </span>
      )}
      <div
        className="px-2 py-0.5 text-center text-[8px] font-medium text-white"
        style={{ backgroundColor: isTwinCard ? "#7c3aed" : barColor }}
      >
        {genLevel != null
          ? genLevel < 0
            ? t("printPage.generationUp", { n: Math.abs(genLevel) })
            : `${displayGenerationNumber(genLevel)}`
          : female
            ? t("common.female")
            : t("common.male")}
        {!living && ` · ${t("common.deceased")}`}
        {isTwinCard && ` · ${t("twins.badge")}`}
      </div>
      <div className="px-2 py-2 text-center">
        <p className="font-display text-xs font-bold leading-tight">{person.givenName}</p>
        {person.fatherName && (
          <p className="mt-0.5 font-display text-[10px] text-stone-600">
            {person.fatherName}
          </p>
        )}
        {notesLine && (
          <p className="mt-0.5 text-[9px] font-medium text-amber-800/90">{notesLine}</p>
        )}
        {(person.laqab || laqabFallback) && (
          <p className="mt-0.5 text-[9px] text-stone-400">
            {person.laqab || laqabFallback}
          </p>
        )}
        {birth && <p className="mt-1 text-[9px] text-stone-500">{birth}</p>}
      </div>
    </div>
  );
}
