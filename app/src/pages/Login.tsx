import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TreePalm } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("admin@bhd.om");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [dbConfigured, setDbConfigured] = useState<boolean | null>(null);

  const authConfig = trpc.auth.config.useQuery();
  const showPasswordForm = true;
  const passwordMode = true;

  useEffect(() => {
    if (params.get("error") === "google") {
      toast.error(t("login.googleError"));
    }
  }, [params, t]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/diag")
      .then((r) => r.json())
      .then((d: { dbConfigured?: boolean }) => {
        if (!cancelled) setDbConfigured(Boolean(d.dbConfigured));
      })
      .catch(() => {
        if (!cancelled) setDbConfigured(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signInWithPassword() {
    setSigningIn(true);
    try {
      // Direct Hono route — tRPC mutations with Zod `.input()` hang on Vercel.
      const res = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.success) {
        toast.error(data.message || t("login.localError") || "فشل تسجيل الدخول");
        return;
      }
      toast.success(t("login.localSuccess"));
      await utils.auth.me.invalidate();
      navigate("/dashboard");
    } catch {
      toast.error(t("login.localError") || "فشل تسجيل الدخول");
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="flex justify-start p-4">
        <LanguageSwitcher variant="outline" />
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <TreePalm className="h-8 w-8" />
            </span>
            <CardTitle className="font-display text-2xl">{t("login.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("login.subtitle")}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {dbConfigured === false ? (
              <div
                className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
                role="status"
              >
                {t("login.dbNotConfigured")}
              </div>
            ) : null}
            {authConfig.data?.googleEnabled && (
              <>
                <Button
                  className="w-full gap-2"
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    window.location.href = "/api/oauth/google";
                  }}
                >
                  <GoogleIcon />
                  {t("login.google")}
                </Button>
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">{t("login.or")}</span>
                  <Separator className="flex-1" />
                </div>
              </>
            )}
            {showPasswordForm ? (
              <>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="username">
                      {passwordMode ? t("login.email") : t("login.localUser")}
                    </Label>
                    <Input
                      id="username"
                      type={passwordMode ? "email" : "text"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      autoComplete={passwordMode ? "email" : "username"}
                      placeholder={passwordMode ? "admin@example.com" : undefined}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">{t("login.localPass")}</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => void signInWithPassword()}
                    disabled={!username.trim() || !password || signingIn}
                  >
                    {signingIn
                      ? t("login.localSigningIn")
                      : passwordMode
                        ? t("login.emailButton")
                        : t("login.localButton")}
                  </Button>
                  {!passwordMode ? (
                    <p className="text-center text-xs text-muted-foreground">
                      {t("login.localNote")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {t("login.or")}
                  </span>
                  <Separator className="flex-1" />
                </div>
              </>
            ) : null}
            <Button
              className="w-full"
              size="lg"
              variant={
                showPasswordForm || authConfig.data?.googleEnabled
                  ? "outline"
                  : "default"
              }
              onClick={() => {
                window.location.href = "/api/oauth/kimi/start";
              }}
            >
              {t("login.button")}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {t("login.note")}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
