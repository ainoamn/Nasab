import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { findDiscoveries, type Discovery } from "@/lib/discoveries";
import { AlertTriangle, UserRoundPlus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  people: Person[];
  rels: Relationship[];
  canWrite?: boolean;
  onOpenPerson: (personId: number) => void;
  onAddParent?: (personId: number, role: "father" | "mother") => void;
  className?: string;
};

function iconFor(kind: Discovery["kind"]) {
  if (kind === "noPhoto") return Camera;
  if (kind === "deathBeforeBirth" || kind === "childBeforeParent") return AlertTriangle;
  if (kind === "possibleDuplicate" || kind === "livingNoBirthYear") return AlertTriangle;
  if (kind.startsWith("missing") || kind === "childNoSpouseLink") return UserRoundPlus;
  return AlertTriangle;
}

/** لوحة اكتشافات: آباء ناقصون، صور ناقصة، … */
export default function DiscoveriesPanel({
  people,
  rels,
  canWrite,
  onOpenPerson,
  onAddParent,
  className,
}: Props) {
  const { t } = useTranslation();
  const items = useMemo(
    () => findDiscoveries(people, rels, { includeNoPhoto: false, limit: 12 }),
    [people, rels],
  );

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3 sm:p-4",
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700" />
        <p className="text-sm font-semibold text-amber-950">
          {t("tree.discoveriesTitle")}
        </p>
        <span className="text-[11px] text-amber-800/80">
          {t("tree.discoveriesCount", { count: items.length })}
        </span>
      </div>
      <ul className="space-y-2">
        {items.map((d) => {
          const Icon = iconFor(d.kind);
          return (
            <li
              key={`${d.kind}-${d.personId}`}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-100 bg-white/80 px-3 py-2"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-amber-700" />
              <button
                type="button"
                className="min-w-0 flex-1 text-start text-sm font-medium underline-offset-2 hover:underline"
                onClick={() => onOpenPerson(d.personId)}
              >
                {d.personName}
                <span className="ms-1 font-normal text-muted-foreground">
                  — {t(`tree.discovery.${d.kind}`)}
                  {d.otherPersonName ? ` (${d.otherPersonName})` : ""}
                </span>
              </button>
              {canWrite && d.kind === "missingFather" && onAddParent && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAddParent(d.personId, "father")}
                >
                  {t("chart.addFather")}
                </Button>
              )}
              {canWrite && d.kind === "missingMother" && onAddParent && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAddParent(d.personId, "mother")}
                >
                  {t("chart.addMother")}
                </Button>
              )}
              {canWrite && d.kind === "missingBothParents" && onAddParent && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAddParent(d.personId, "father")}
                >
                  {t("chart.addFather")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
