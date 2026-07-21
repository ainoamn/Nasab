import { NavLink, Outlet, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { useAdmin } from "@/hooks/useAdmin";
import AppHeader from "@/components/AppHeader";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Shield,
  ArrowRight,
  Crown,
  Calculator,
  CreditCard,
  Ticket,
} from "lucide-react";

const navItems = [
  { to: "/admin", end: true, icon: LayoutDashboard, key: "overview" },
  { to: "/admin/users", end: false, icon: Users, key: "users" },
  { to: "/admin/plans", end: false, icon: Crown, key: "plans" },
  { to: "/admin/coupons", end: false, icon: Ticket, key: "coupons" },
  { to: "/admin/accounting", end: false, icon: Calculator, key: "accounting" },
  { to: "/admin/invoices", end: false, icon: Receipt, key: "invoices" },
  { to: "/admin/gateways", end: false, icon: CreditCard, key: "gateways" },
] as const;

export default function AdminLayout() {
  const { isLoading, isAdmin } = useAdmin();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AppHeader />
        <div className="mx-auto max-w-7xl p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2"
          >
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            {t("admin.backToApp")}
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Shield className="h-6 w-6" />
            </span>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">
                {t("admin.title")}
              </h1>
              <p className="text-muted-foreground text-sm">{t("admin.subtitle")}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-56 shrink-0">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {navItems.map(({ to, end, icon: Icon, key }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(`admin.nav.${key}`)}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
