import { useEffect, useLayoutEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { bhdAdminEntryHref, bhdStartHref } from "@/const";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TreePalm } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useBuildBehind } from "@/hooks/useBuildBehind";
import { toast } from "sonner";

function isAdminReturnPath(value: string | null): boolean {
  return Boolean(
    value &&
      value.startsWith("/admin") &&
      !value.startsWith("//") &&
      !value.includes("://"),
  );
}

export default function Login() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { liveBuild, mainSha, buildBehind, dbConfigured } = useBuildBehind();

  const dbBlocked = dbConfigured === false;
  const returnTo = params.get("returnTo") || params.get("next");
  const loginError = params.get("error");
  const wantsAdmin =
    params.get("admin") === "1" ||
    params.get("local") === "1" ||
    isAdminReturnPath(returnTo);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, noarchive");
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  useEffect(() => {
    if (loginError === "google") toast.error(t("login.googleError"));
    if (loginError === "bhd") toast.error(t("login.bhdError"));
  }, [loginError, t]);

  useLayoutEffect(() => {
    if (loginError || dbBlocked) return;
    if (wantsAdmin) {
      window.location.replace(bhdAdminEntryHref(returnTo));
      return;
    }
    window.location.replace(bhdStartHref(returnTo));
  }, [wantsAdmin, loginError, dbBlocked, returnTo]);

  const redirecting = !dbBlocked && !loginError;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex justify-between items-center p-4">
        <Link
          to="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("nav.home")}
        </Link>
        <LanguageSwitcher variant="outline" />
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <TreePalm className="h-8 w-8" />
            </span>
            <CardTitle className="font-display text-2xl">
              {t("login.title")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("login.bhdSubtitle")}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {dbBlocked ? (
              <div
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                role="status"
              >
                <p>{t("login.dbNotConfigured")}</p>
                <Link
                  to="/setup"
                  className="mt-1 inline-block text-sm font-medium underline underline-offset-2"
                >
                  {t("login.openSetup")}
                </Link>
              </div>
            ) : null}
            {buildBehind ? (
              <div
                className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                role="status"
              >
                <p>
                  {t("login.buildBehind", {
                    live: liveBuild,
                    main: mainSha,
                  })}
                </p>
                <Link
                  to="/setup"
                  className="mt-1 inline-block text-sm font-medium underline underline-offset-2"
                >
                  {t("login.openSetup")}
                </Link>
              </div>
            ) : null}

            {redirecting ? (
              <p className="text-center text-sm text-muted-foreground py-2">
                {t("login.bhdRedirecting")}
              </p>
            ) : (
              <Button
                className="w-full gap-2"
                size="lg"
                disabled={dbBlocked}
                onClick={() => {
                  window.location.href = wantsAdmin
                    ? bhdAdminEntryHref(returnTo)
                    : bhdStartHref(returnTo);
                }}
              >
                {wantsAdmin ? t("login.adminEntry") : t("login.bhd")}
              </Button>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {wantsAdmin ? t("login.adminEntryNote") : t("login.bhdNote")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
