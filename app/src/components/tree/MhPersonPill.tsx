import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { Person } from "@db/tables";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";

type Props = {
  person: Person | null;
  years?: string | null;
  selected?: boolean;
  placeholder?: string;
  onClick?: () => void;
  onPlaceholderClick?: () => void;
  className?: string;
  /** شارة القرابة بالنسبة للمحور */
  relationLabel?: string | null;
  onFocus?: () => void;
  onHowRelated?: () => void;
};

/** كبسولة أفقية بأسلوب مخطط الأسلاف (MyHeritage pedigree) */
export function MhPersonPill({
  person,
  years,
  selected,
  placeholder,
  onClick,
  onPlaceholderClick,
  className,
  relationLabel,
  onFocus,
  onHowRelated,
}: Props) {
  const { t } = useTranslation();

  if (!person) {
    const Comp = onPlaceholderClick ? "button" : "div";
    return (
      <Comp
        type={onPlaceholderClick ? "button" : undefined}
        onClick={onPlaceholderClick}
        className={cn(
          "flex h-12 w-[11.5rem] items-center gap-2 rounded-full border border-dashed border-stone-300 bg-white/70 px-3 text-xs text-stone-400",
          onPlaceholderClick &&
            "cursor-pointer hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700",
          className,
        )}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-dashed border-current text-base">
          +
        </span>
        <span className="truncate">{placeholder ?? "—"}</span>
      </Comp>
    );
  }

  const female = person.gender === "female";
  const pill = (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onFocus?.();
      }}
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

  if (!relationLabel && !onFocus && !onHowRelated) {
    return pill;
  }

  return (
    <HoverCard openDelay={280} closeDelay={80}>
      <HoverCardTrigger asChild>{pill}</HoverCardTrigger>
      <HoverCardContent side="top" className="w-56 p-3">
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 overflow-hidden rounded-full text-white",
              female ? "bg-pink-500" : "bg-sky-600",
            )}
          >
            {person.photoUrl ? (
              <img src={person.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm">
                {person.givenName.slice(0, 1)}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{person.givenName}</p>
            {years && (
              <p className="text-[11px] text-muted-foreground">{years}</p>
            )}
            {relationLabel && (
              <p className="mt-1 inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-800">
                {relationLabel}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2.5 grid gap-1.5">
          {onClick && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 w-full text-xs"
              onClick={onClick}
            >
              {t("chart.openProfile")}
            </Button>
          )}
          {onFocus && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-full text-xs"
              onClick={onFocus}
            >
              {t("chart.focusHere")}
            </Button>
          )}
          {onHowRelated && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 w-full text-xs"
              onClick={onHowRelated}
            >
              {t("tree.howRelatedTitle")}
            </Button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
