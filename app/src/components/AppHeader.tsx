import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { BhdAppSwitcher } from "@/components/bhd/BhdAppSwitcher";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, TreePalm, Shield } from "lucide-react";

export default function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isAdmin = user?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur no-print">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <TreePalm className="h-5 w-5" />
          </span>
          <span className="font-display text-xl sm:text-2xl font-bold text-primary truncate">
            {t("brand")}
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="gap-2 px-2 sm:px-3"
            title={t("nav.myTrees")}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">{t("nav.myTrees")}</span>
          </Button>
          {isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="gap-2 px-2 sm:px-3"
              title={t("nav.admin")}
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.admin")}</span>
            </Button>
          ) : null}
          {user ? (
            <BhdAppSwitcher
              user={{
                name: user.name ?? "",
                email: user.email ?? "",
                picture: user.avatar ?? null,
              }}
              onSignOut={logout}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
