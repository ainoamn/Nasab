import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const KEYS = [
  { keys: "/", labelKey: "shortcuts.search" },
  { keys: "Esc", labelKey: "shortcuts.escape" },
  { keys: "H", labelKey: "shortcuts.home" },
  { keys: "R", labelKey: "shortcuts.related" },
  { keys: "2×", labelKey: "shortcuts.dblFocus" },
  { keys: "?", labelKey: "shortcuts.help" },
] as const;

/** دليل اختصارات لوحة المفاتيح */
export default function ShortcutsDialog({ open, onOpenChange }: Props) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-sky-600" />
            {t("shortcuts.title")}
          </DialogTitle>
          <DialogDescription>{t("shortcuts.hint")}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {KEYS.map((row) => (
            <li
              key={row.keys}
              className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
            >
              <span>{t(row.labelKey)}</span>
              <kbd className="rounded border bg-background px-2 py-0.5 font-mono text-xs shadow-sm">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
