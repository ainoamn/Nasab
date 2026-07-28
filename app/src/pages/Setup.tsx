import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TreePalm, CheckCircle2, XCircle, CircleDashed } from "lucide-react";
import { toast } from "sonner";

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
# then Redeploy`;

export default function Setup() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language?.startsWith("ar");
  const [diag, setDiag] = useState<Diag | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
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
    return () => {
      cancelled = true;
    };
  }, []);

  const rows: Row[] = [
    {
      id: "api",
      label: ar ? "واجهة التشخيص /api/diag" : "Diagnostics API",
      ok: diag ? true : loading ? null : false,
    },
    {
      id: "sidecar",
      label: ar ? "حزمة Neon sidecar" : "Neon sidecar bundle",
      ok: diag ? Boolean(diag.sidecar) : null,
    },
    {
      id: "db",
      label: ar ? "DATABASE_URL على الخادم" : "DATABASE_URL on server",
      ok: diag ? Boolean(diag.dbConfigured) : null,
      hint: diag?.dbHost || undefined,
    },
    {
      id: "secret",
      label: ar ? "APP_SECRET مضبوط" : "APP_SECRET set",
      ok: diag ? Boolean(diag.hasAppSecret) : null,
    },
    {
      id: "publicUrl",
      label: ar ? "APP_PUBLIC_URL" : "APP_PUBLIC_URL",
      ok: diag ? Boolean(diag.hasAppPublicUrl) : null,
    },
    {
      id: "origins",
      label: ar ? "ALLOWED_ORIGINS" : "ALLOWED_ORIGINS",
      ok: diag ? Boolean(diag.hasAllowedOrigins) : null,
    },
    {
      id: "admin",
      label: ar ? "دخول بالبريد مفعّل" : "Password login configured",
      ok: diag ? Boolean(diag.passwordLoginConfigured) : null,
    },
    {
      id: "build",
      label: ar ? "بصمة البناء" : "Build fingerprint",
      ok: diag?.build ? true : loading ? null : false,
      hint: diag?.build
        ? `${diag.build}${diag.builtAt ? ` · ${diag.builtAt}` : ""}`
        : undefined,
    },
  ];

  const ready = Boolean(
    diag?.dbConfigured && diag?.hasAppSecret && diag?.sidecar,
  );

  async function copyEnvHelp() {
    try {
      await navigator.clipboard.writeText(ENV_SNIPPET);
      toast.success(ar ? "تم النسخ" : "Copied");
    } catch {
      toast.error(ar ? "تعذّر النسخ" : "Copy failed");
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
            <CardTitle className="font-display text-xl">
              {ar ? "جاهزية الإطلاق" : "Launch readiness"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {ar
                ? "فحص ربط الخادم بقاعدة Neon وخطوات إكمال الإنتاج."
                : "Check server ↔ Neon wiring and remaining production steps."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
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
                {ar
                  ? "الخادم جاهز. يمكنك تسجيل الدخول بحساب المشرف."
                  : "Server is ready. You can sign in with the admin account."}
              </div>
            ) : (
              <div className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                <p>
                  {ar
                    ? "أضف متغيرات البيئة على Vercel ثم أعد النشر:"
                    : "Add Vercel env vars, then redeploy:"}
                </p>
                <pre
                  className="overflow-x-auto rounded bg-background/80 p-2 text-xs"
                  dir="ltr"
                >
                  {ENV_SNIPPET}
                </pre>
                <Button type="button" size="sm" variant="secondary" onClick={() => void copyEnvHelp()}>
                  {ar ? "نسخ الأوامر" : "Copy commands"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {ar
                    ? "التفاصيل في UPGRADE.md — المرحلة 2."
                    : "Details in UPGRADE.md — phase 2."}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/login">{ar ? "صفحة الدخول" : "Login"}</Link>
              </Button>
              <Button asChild variant="outline">
                <a href="/api/diag" target="_blank" rel="noreferrer">
                  /api/diag
                </a>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/">{ar ? "الرئيسية" : "Home"}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

