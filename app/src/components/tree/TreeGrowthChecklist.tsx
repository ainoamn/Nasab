import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { findPersonGaps } from "@/lib/personGaps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Circle,
  Sprout,
  UserPlus,
  Camera,
  Calendar,
} from "lucide-react";

type ChecklistAction =
  | { kind: "addFather"; person: Person }
  | { kind: "addMother"; person: Person }
  | { kind: "addSpouse"; person: Person }
  | { kind: "editPhoto"; person: Person }
  | { kind: "editBirth"; person: Person }
  | { kind: "addFirst" };

type Props = {
  people: Person[];
  rels: Relationship[];
  focusPerson: Person | null;
  canWrite: boolean;
  completenessScore: number;
  onAddRelative?: (
    personId: number,
    kinship: "father" | "mother" | "spouse",
  ) => void;
  onEditPerson?: (person: Person) => void;
  onAddFirst?: () => void;
  className?: string;
};

type Row = {
  id: string;
  done: boolean;
  label: string;
  icon: typeof Circle;
  action?: ChecklistAction;
};

/**
 * قائمة نمو للشجرة الصغيرة/الناقصة — تحول مؤشر الاكتمال إلى خطوات قابلة للتنفيذ.
 */
export default function TreeGrowthChecklist({
  people,
  rels,
  focusPerson,
  canWrite,
  completenessScore,
  onAddRelative,
  onEditPerson,
  onAddFirst,
  className,
}: Props) {
  const { t } = useTranslation();

  const rows = useMemo((): Row[] => {
    if (people.length === 0) {
      return [
        {
          id: "first",
          done: false,
          label: t("tree.growth.addFirst"),
          icon: UserPlus,
          action: { kind: "addFirst" },
        },
      ];
    }

    const anchor =
      focusPerson ??
      people.find((p) => p.gender !== "female") ??
      people[0]!;
    const gaps = findPersonGaps(anchor, people, rels);
    const kinds = new Set(gaps.map((g) => g.kind));

    const out: Row[] = [
      {
        id: "people",
        done: people.length >= 3,
        label: t("tree.growth.people3", { count: people.length }),
        icon: UserPlus,
        action:
          canWrite && people.length < 3
            ? { kind: "addSpouse", person: anchor }
            : undefined,
      },
      {
        id: "father",
        done: !kinds.has("missingFather") && !kinds.has("missingBothParents"),
        label: t("tree.growth.addFather", { name: anchor.givenName }),
        icon: UserPlus,
        action:
          canWrite &&
          (kinds.has("missingFather") || kinds.has("missingBothParents"))
            ? { kind: "addFather", person: anchor }
            : undefined,
      },
      {
        id: "mother",
        done: !kinds.has("missingMother") && !kinds.has("missingBothParents"),
        label: t("tree.growth.addMother", { name: anchor.givenName }),
        icon: UserPlus,
        action:
          canWrite &&
          (kinds.has("missingMother") || kinds.has("missingBothParents"))
            ? { kind: "addMother", person: anchor }
            : undefined,
      },
      {
        id: "photo",
        done: !kinds.has("noPhoto"),
        label: t("tree.growth.addPhoto", { name: anchor.givenName }),
        icon: Camera,
        action:
          canWrite && kinds.has("noPhoto")
            ? { kind: "editPhoto", person: anchor }
            : undefined,
      },
      {
        id: "birth",
        done: !kinds.has("noBirthYear"),
        label: t("tree.growth.addBirth", { name: anchor.givenName }),
        icon: Calendar,
        action:
          canWrite && kinds.has("noBirthYear")
            ? { kind: "editBirth", person: anchor }
            : undefined,
      },
    ];

    return out;
  }, [people, rels, focusPerson, canWrite, t]);

  const show =
    people.length === 0 ||
    people.length <= 8 ||
    completenessScore < 60;
  if (!show) return null;

  const pending = rows.filter((r) => !r.done);
  if (pending.length === 0 && people.length > 0 && completenessScore >= 60) {
    return null;
  }

  const run = (action: ChecklistAction) => {
    if (action.kind === "addFirst") {
      onAddFirst?.();
      return;
    }
    if (action.kind === "addFather") {
      onAddRelative?.(action.person.id, "father");
      return;
    }
    if (action.kind === "addMother") {
      onAddRelative?.(action.person.id, "mother");
      return;
    }
    if (action.kind === "addSpouse") {
      onAddRelative?.(action.person.id, "spouse");
      return;
    }
    onEditPerson?.(action.person);
  };

  return (
    <div
      className={cn(
        "mb-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-start gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
          <Sprout className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-emerald-950">
            {t("tree.growthTitle")}
          </h3>
          <p className="text-xs text-emerald-900/70">
            {t("tree.growthHint", { score: completenessScore })}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {rows.map((row) => {
          const Icon = row.done ? CheckCircle2 : row.icon;
          return (
            <li
              key={row.id}
              className="flex items-center gap-2 rounded-xl border border-emerald-100/80 bg-white/70 px-2.5 py-2"
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  row.done ? "text-emerald-600" : "text-stone-400",
                )}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  row.done && "text-muted-foreground line-through",
                )}
              >
                {row.label}
              </span>
              {!row.done && row.action && canWrite && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 shrink-0 text-xs"
                  onClick={() => run(row.action!)}
                >
                  {t("tree.growthFix")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
