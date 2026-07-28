import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreePalm, CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import { toast } from "sonner";
import { useBuildBehind } from "@/hooks/useBuildBehind";

type Diag = {
  ok?: boolean;
  dbConfigured?: boolean;
  dbIsPostgres?: boolean;
  dbHost?: string | null;
  sidecar?: boolean;
  hasAppSecret?: boolean;
  passwordLoginConfigured?: boolean;
  hasAppPublicUrl?: boolean;
  hasAllowedOrigins?: boolean;
  vercel?: boolean;
  build?: string | null;
  builtAt?: string | null;
};

type Row = { id: string; label: string; ok: boolean | null; hint?: string };

const ENV_SNIPPET = `cd app
npm run vercel:print-env
# paste into Vercel → Environment Variables
# then Redeploy
npm run deploy:status
npm run prod:smoke`;

export default function Setup() {
  const { t } = useTranslation();
  const [diag, setDiag] = useState<Diag | null>(null);
  const [loading, setLoading] = useState(true);
  const { liveBuild, mainSha, buildBehind } = useBuildBehind();

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      setLoading(true);
      void fetch("/api/diag")
        .then((r) => r.json())
        .then((d: Diag) => {
          if (!cancelled) setDiag(d);
        })
        .catch(() => {
          if (!cancelled) setDiag(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshDiag = () => {
    setLoading(true);
    void fetch("/api/diag")
      .then((r) => r.json())
      .then((d: Diag) => setDiag(d))
      .catch(() => setDiag(null))
      .finally(() => setLoading(false));
  };

  const buildHint = diag?.build || liveBuild;

  const rows: Row[] = [
    {
      id: "api",
      label: t("setup.rowApi"),
      ok: diag ? true : loading ? null : false,
    },
    {
      id: "sidecar",
      label: t("setup.rowSidecar"),
      ok: diag ? Boolean(diag.sidecar) : null,
    },
    {
      id: "db",
      label: t("setup.rowDb"),
      ok: diag ? Boolean(diag.dbConfigured) : null,
      hint: diag?.dbHost || undefined,
    },
    {
      id: "secret",
      label: t("setup.rowSecret"),
      ok: diag ? Boolean(diag.hasAppSecret) : null,
    },
    {
      id: "publicUrl",
      label: t("setup.rowPublicUrl"),
      ok: diag ? Boolean(diag.hasAppPublicUrl) : null,
    },
    {
      id: "origins",
      label: t("setup.rowOrigins"),
      ok: diag ? Boolean(diag.hasAllowedOrigins) : null,
    },
    {
      id: "admin",
      label: t("setup.rowAdmin"),
      ok: diag ? Boolean(diag.passwordLoginConfigured) : null,
    },
    {
      id: "build",
      label: t("setup.rowBuild"),
      ok: buildHint ? (buildBehind ? false : true) : loading ? null : false,
      hint: buildHint
        ? `${buildHint}${diag?.builtAt ? ` · ${diag.builtAt}` : ""}${
            buildBehind && mainSha ? ` → main ${mainSha}` : ""
          }`
        : undefined,
    },
  ];

  const ready = Boolean(
    diag?.dbConfigured && diag?.hasAppSecret && diag?.sidecar,
  );

  async function copyEnvHelp() {
    try {
      await navigator.clipboard.writeText(ENV_SNIPPET);
      toast.success(t("setup.copied"));
    } catch {
      toast.error(t("setup.copyFailed"));
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 pt-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TreePalm className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold">{t("brand")}</span>
          </Link>
          <LanguageSwitcher variant="outline" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-xl">{t("setup.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("setup.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {buildBehind ? (
              <div
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm"
                role="status"
              >
                <p>
                  {t("setup.buildBehind", {
                    live: buildHint,
                    main: mainSha,
                  })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("setup.buildBehindHint")}
                </p>
              </div>
            ) : null}

            <ul className="space-y-3">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-start gap-3 rounded-md border bg-background px-3 py-2"
                >
                  {row.ok === true ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  ) : row.ok === false ? (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  ) : (
                    <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{row.label}</div>
                    {row.hint ? (
                      <div className="truncate text-xs text-muted-foreground" dir="ltr">
                        {row.hint}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {ready ? (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
                {t("setup.ready")}
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                <p>{t("setup.notReady")}</p>
                <pre
                  className="overflow-x-auto rounded bg-background/80 p-2 text-xs"
                  dir="ltr"
                >
                  {ENV_SNIPPET}
                </pre>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void copyEnvHelp()}
                >
                  {t("setup.copyCommands")}
                </Button>
                <p className="text-xs text-muted-foreground">{t("setup.details")}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/login">{t("setup.login")}</Link>
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={loading}
                onClick={refreshDiag}
              >
                {t("setup.refreshDiag")}
              </Button>
              <Button asChild variant="outline">
                <a href="/api/diag" target="_blank" rel="noreferrer">
                  {t("setup.openDiag")}
                </a>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/">{t("setup.home")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
