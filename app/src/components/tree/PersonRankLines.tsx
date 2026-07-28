import type { Person } from "@db/tables";
import type { PersonRanks } from "@/lib/birthOrder";
import { formatSiblingLabel } from "@/lib/birthOrder";
import { cn } from "@/lib/utils";

type Props = {
  ranks: PersonRanks | undefined;
  gender: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  className?: string;
  /** بطاقة الشجرة: أصغر */
  dense?: boolean;
  /** للتمييز التوأم في سطر الترتيب بين الإخوة */
  person?: Person;
  people?: Person[];
  /** بديل خفيف من سياق المخطط دون قائمة people */
  twinOrder?: number | null;
  twinTotal?: number | null;
};

export default function PersonRankLines({
  ranks,
  gender,
  t,
  className,
  dense,
  person,
  people,
  twinOrder,
  twinTotal,
}: Props) {
  if (!ranks) return null;

  const lines: string[] = [];
  const twinFromMeta =
    twinOrder != null && twinTotal != null && twinTotal >= 2
      ? `${t("twins.badge")} ${twinOrder}/${twinTotal}`
      : null;
  const twinFromPeople =
    person?.twinGroupId != null && people
      ? formatSiblingLabel(person, people, ranks, t("twins.badge"))
      : null;
  const twinLine = twinFromPeople || twinFromMeta;

  if (twinLine) {
    lines.push(twinLine);
  } else if (ranks.amongSiblings) {
    lines.push(t("ranks.inFamily", { n: ranks.amongSiblings }));
  }
  if (ranks.amongGenderInTree) {
    lines.push(
      gender === "female"
        ? t("ranks.amongFemalesInTree", { n: ranks.amongGenderInTree })
        : t("ranks.amongMalesInTree", { n: ranks.amongGenderInTree }),
    );
  }
  if (ranks.amongCousins) {
    lines.push(t("ranks.amongGrandchildren", { n: ranks.amongCousins }));
  }

  if (lines.length === 0) return null;

  return (
    <ul
      className={cn(
        "space-y-0.5 border-t border-slate-200/70 pt-1.5",
        dense ? "mt-1.5" : "mt-2",
        className,
      )}
    >
      {lines.map((line) => (
        <li
          key={line}
          className={cn(
            "leading-snug text-slate-500 truncate",
            dense ? "text-[8px]" : "text-[9px] sm:text-[10px]",
          )}
        >
          {line}
        </li>
      ))}
    </ul>
  );
}
