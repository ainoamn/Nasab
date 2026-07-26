import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type QuickKinship =
  | "father"
  | "mother"
  | "brother"
  | "sister"
  | "spouse"
  | "son"
  | "daughter";

const OPTIONS: QuickKinship[] = [
  "father",
  "mother",
  "spouse",
  "son",
  "daughter",
  "brother",
  "sister",
];

type Props = {
  onPick: (kinship: QuickKinship) => void;
  className?: string;
  /** حجم الزر — صغير تحت البطاقة */
  compact?: boolean;
};

/** قائمة + لاختيار صلة القرابة قبل فتح نموذج الإضافة (أسلوب MyHeritage) */
export default function QuickAddMenu({ onPick, className, compact }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-no-pan
          title={t("tree.addRelative")}
          aria-label={t("tree.addRelative")}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className={cn(
            "z-[2] flex items-center justify-center rounded-full border border-stone-300 bg-white text-stone-600 shadow-sm hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700",
            compact ? "h-5 w-5 -mt-0.5" : "h-8 w-8",
            className,
          )}
        >
          <Plus className={compact ? "h-3 w-3" : "h-4 w-4"} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="center"
        side="bottom"
        sideOffset={6}
        className="w-44 p-1.5"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("chart.quickAddTitle")}
        </p>
        <ul className="grid gap-0.5">
          {OPTIONS.map((k) => (
            <li key={k}>
              <button
                type="button"
                className="flex w-full rounded-md px-2.5 py-1.5 text-start text-sm hover:bg-sky-50 hover:text-sky-900"
                onClick={() => {
                  setOpen(false);
                  onPick(k);
                }}
              >
                {t(`personForm.kinships.${k}`)}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
