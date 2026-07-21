import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export default function LanguageSwitcher({ variant = "ghost" }: { variant?: "ghost" | "outline" | "secondary" }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  return (
    <Button
      variant={variant}
      size="sm"
      className="gap-1.5 font-bold"
      onClick={() => void i18n.changeLanguage(isAr ? "en" : "ar")}
      title={isAr ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Languages className="h-4 w-4" />
      {isAr ? "EN" : "عربي"}
    </Button>
  );
}
