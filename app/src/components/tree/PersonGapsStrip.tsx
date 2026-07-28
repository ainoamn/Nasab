import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Person, Relationship } from "@db/tables";
import { findPersonGaps, type PersonGapKind } from "@/lib/personGaps";
import { Button } from "@/components/ui/button";
import {
  Camera,
  Calendar,
  UserRoundPlus,
  Heart,
  MessageCircle,
  Users2,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  person: Person;
  people: Person[];
  rels: Relationship[];
  canWrite?: boolean;
  onEdit?: () => void;
  onAddParent?: (role: "father" | "mother") => void;
  onAddSpouse?: () => void;
  onWhatsAppGaps?: () => void;
  onOpenPerson?: (personId: number) => void;
  onHighlightPair?: (aId: number, bId: number) => void;
  onLinkTwin?: (personId: number, twinOfPersonId: number) => void;
  className?: string;
};

function iconFor(kind: PersonGapKind) {
  if (kind === "noPhoto") return Camera;
  if (kind === "noBirthYear") return Calendar;
  if (kind === "childNoSpouseLink") return Heart;
  if (kind === "possibleTwin") return Users2;
  return UserRoundPlus;
}

/** قائمة «ما ينقص هذا الملف» بأسلوب اكتشافات شخصية */
export default function PersonGapsStrip({
  person,
  people,
  rels,
  canWrite,
  onEdit,
  onAddParent,
  onAddSpouse,
  onWhatsAppGaps,
  onOpenPerson,
  onHighlightPair,
  onLinkTwin,
  className,
}: Props) {
  const { t } = useTranslation();
  const gaps = useMemo(
    () => findPersonGaps(person, people, rels),
    [person, people, rels],
  );

  if (gaps.length === 0) return null;

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-sky-200/80 bg-sky-50/50 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-sky-950">
          {t("detail.gapsTitle")}
          <span className="ms-1 text-xs font-normal text-sky-800/80">
            ({gaps.length})
          </span>
        </p>
        {onWhatsAppGaps && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ms-auto h-7 gap-1 text-xs"
            onClick={onWhatsAppGaps}
          >
            <MessageCircle className="h-3 w-3" />
            {t("detail.shareGapsWhatsApp")}
          </Button>
        )}
      </div>
      <ul className="space-y-1.5">
        {gaps.map((g) => {
          const Icon = iconFor(g.kind);
          return (
            <li
              key={`${g.kind}-${g.otherPersonId ?? ""}`}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-100 bg-white/80 px-2.5 py-1.5 text-sm"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-sky-700" />
              <span className="min-w-0 flex-1 text-sky-950">
                {t(`detail.gap.${g.kind}`)}
                {g.otherPersonName ? (
                  <span className="ms-1 text-muted-foreground">
                    ({g.otherPersonName})
                  </span>
                ) : null}
              </span>
              {g.kind === "possibleTwin" && g.otherPersonId != null && (
                <>
                  {canWrite && onLinkTwin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs border-violet-300 text-violet-900 hover:bg-violet-50"
                      onClick={() => onLinkTwin(person.id, g.otherPersonId!)}
                    >
                      <Users2 className="h-3 w-3" />
                      {t("tree.discoveryLinkTwin")}
                    </Button>
                  )}
                  {onHighlightPair && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() =>
                        onHighlightPair(person.id, g.otherPersonId!)
                      }
                    >
                      <Eye className="h-3 w-3" />
                      {t("tree.discoveryShowPath")}
                    </Button>
                  )}
                  {onOpenPerson && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => onOpenPerson(g.otherPersonId!)}
                    >
                      {t("tree.discoveryOpenOther")}
                    </Button>
                  )}
                </>
              )}
              {canWrite &&
                (g.kind === "noPhoto" || g.kind === "noBirthYear") &&
                onEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={onEdit}
                  >
                    {t("common.edit")}
                  </Button>
                )}
              {canWrite && g.kind === "missingFather" && onAddParent && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAddParent("father")}
                >
                  {t("chart.addFather")}
                </Button>
              )}
              {canWrite && g.kind === "missingMother" && onAddParent && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAddParent("mother")}
                >
                  {t("chart.addMother")}
                </Button>
              )}
              {canWrite && g.kind === "missingBothParents" && onAddParent && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAddParent("father")}
                >
                  {t("chart.addFather")}
                </Button>
              )}
              {canWrite && g.kind === "childNoSpouseLink" && onAddSpouse && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={onAddSpouse}
                >
                  {t("personForm.kinships.spouse")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
