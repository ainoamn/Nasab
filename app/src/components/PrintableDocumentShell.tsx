import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  title?: string;
};

/** غلاف للتقارير والكشوفات مع زر طباعة */
export function PrintableDocumentShell({ children, className, title }: Props) {
  const { t } = useTranslation();

  const handlePrint = () => {
    document.title = title ?? document.title;
    window.print();
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-end no-print">
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          {t("admin.company.printDocument")}
        </Button>
      </div>
      <div className="print-document rounded-xl border bg-background p-4 sm:p-6 print:border-0 print:shadow-none print:p-0">
        {children}
      </div>
    </div>
  );
}
