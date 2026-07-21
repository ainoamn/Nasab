import type { PersonRanks } from "@/lib/birthOrder";
import { cn } from "@/lib/utils";

type Props = {
  ranks: PersonRanks | undefined;
  gender: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
  className?: string;
  /** بطاقة الشجرة: أصغر */
  dense?: boolean;
};

export default function PersonRankLines({
  ranks,
  gender,
  t,
  className,
  dense,
}: Props) {
  if (!ranks) return null;

  const lines: string[] = [];
  if (ranks.amongSiblings) {
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
