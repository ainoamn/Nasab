import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { BhdAppSwitcher } from "@/components/bhd/BhdAppSwitcher";
import { BhdPrivacyGate } from "@/components/bhd/BhdPrivacyGate";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, TreePalm, Shield } from "lucide-react";

export default function AppHeader() {
  const { user, identityUser, accounts, logout, logoutAll, switchAccount, addAccount } =
    useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAdmin = user?.role === "admin";
  const locale = i18n.language?.startsWith("en") ? "en" : "ar";

  const switcherUser = identityUser
    ? identityUser
    : {
        id: user?.bhdSub ?? user?.unionId ?? undefined,
        name: user?.name ?? "",
        email: user?.email ?? "",
        username: user?.username ?? null,
        phone: user?.phone ?? null,
        picture: user?.avatar ?? null,
      };

  const productSub = user?.bhdSub ?? (user?.unionId?.startsWith("bhd:") ? user.unionId.slice(4) : undefined);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur no-print">
      {user ? (
        <BhdPrivacyGate productSub={productSub ?? switcherUser.id} productEmail={user.email} />
      ) : null}
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
              user={switcherUser}
              accounts={accounts}
              onSignOut={logout}
              onSignOutAll={logoutAll}
              onSwitchAccount={switchAccount}
              onAddAccount={addAccount}
              locale={locale}
            />
          ) : null}
        </div>
      </div>
    </header>
  );
}
