import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, LayoutDashboard, TreePalm, UserCircle, Shield } from "lucide-react";

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-full ring-offset-2 focus-visible:ring-2"
                aria-label={user?.name ?? t("user")}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user?.avatar ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {user?.name?.charAt(0) ?? "؟"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium truncate">{user?.name ?? t("user")}</p>
                <p className="text-xs text-muted-foreground font-normal truncate">
                  {user?.email ?? ""}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/account")}
                className="gap-2 cursor-pointer"
              >
                <UserCircle className="h-4 w-4" /> {t("nav.account")}
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem
                  onClick={() => navigate("/admin")}
                  className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <Shield className="h-4 w-4" /> {t("nav.admin")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => navigate("/dashboard")}
                className="gap-2 cursor-pointer"
              >
                <LayoutDashboard className="h-4 w-4" /> {t("nav.dashboard")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4" /> {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
