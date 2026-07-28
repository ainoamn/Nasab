import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export default function LanguageSwitcher({ variant = "ghost" }: { variant?: "ghost" | "outline" | "secondary" }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const switchLabel = isAr
    ? t("common.switchToEnglish")
    : t("common.switchToArabic");

  return (
    <Button
      variant={variant}
      size="sm"
      className="gap-1.5 font-bold"
      onClick={() => void i18n.changeLanguage(isAr ? "en" : "ar")}
      title={switchLabel}
      aria-label={switchLabel}
    >
      <Languages className="h-4 w-4" />
      {isAr ? "EN" : "عربي"}
    </Button>
  );
}
