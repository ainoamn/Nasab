import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useBuildBehind } from "@/hooks/useBuildBehind";

export default function NotFound() {
  const { t } = useTranslation();
  const { liveBuild, mainSha, buildBehind, dbConfigured } = useBuildBehind();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <LanguageSwitcher variant="outline" />
      {dbConfigured === false || buildBehind ? (
        <div
          className="w-full max-w-sm rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
          role="status"
        >
          {dbConfigured === false ? (
            <p>{t("notFound.dbNotConfigured")}</p>
          ) : null}
          {buildBehind ? (
            <p className={dbConfigured === false ? "mt-1" : undefined}>
              {t("notFound.buildBehind", {
                live: liveBuild,
                main: mainSha,
              })}
            </p>
          ) : null}
          <Link
            to="/setup"
            className="mt-1 inline-block font-medium underline underline-offset-2"
          >
            {t("notFound.openSetup")}
          </Link>
        </div>
      ) : null}
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold">404</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-bold">{t("notFound.title")}</p>
          <p className="text-muted-foreground text-sm">{t("notFound.body")}</p>
          <Button asChild className="w-full">
            <Link to="/">{t("notFound.home")}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
