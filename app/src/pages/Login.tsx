import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TreePalm, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useBuildBehind } from "@/hooks/useBuildBehind";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { liveBuild, mainSha, buildBehind, dbConfigured } = useBuildBehind();

  const authConfig = trpc.auth.config.useQuery();
  const googleEnabled = Boolean(authConfig.data?.googleEnabled);
  const showPasswordForm = authConfig.data?.passwordLogin !== false;
  const passwordMode = !authConfig.data?.devLocalAuth;
  const dbBlocked = dbConfigured === false;

  useEffect(() => {
    if (params.get("error") === "google") {
      toast.error(t("login.googleError"));
    }
  }, [params, t]);

  async function signInWithPassword(e?: FormEvent) {
    e?.preventDefault();
    if (dbBlocked) return;
    setSigningIn(true);
    try {
      const res = await fetch("/api/auth/password-login", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        credentials: "include",
        body: new URLSearchParams({
          username: username.trim(),
          password,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };
      if (!res.ok || !data.success) {
        toast.error(data.message || t("login.localError"));
        return;
      }
      toast.success(t("login.localSuccess"));
      await utils.auth.me.invalidate();
      navigate("/dashboard");
    } catch {
      toast.error(t("login.localError"));
    } finally {
      setSigningIn(false);
    }
  }

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
              {t("login.subtitle")}
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

            {googleEnabled ? (
              <Button
                className="w-full gap-2"
                size="lg"
                disabled={dbBlocked || signingIn}
                onClick={() => {
                  window.location.href = "/api/oauth/google";
                }}
              >
                <GoogleIcon />
                {t("login.google")}
              </Button>
            ) : (
              <div
                className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground space-y-1"
                role="status"
              >
                <p className="font-medium text-foreground">
                  {t("login.googlePendingTitle")}
                </p>
                <p>{t("login.googlePendingBody")}</p>
              </div>
            )}

            <p className="text-center text-xs text-muted-foreground">
              {t("login.usersNote")}
            </p>

            {showPasswordForm ? (
              <>
                <div className="flex items-center gap-3 pt-1">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground">
                    {t("login.or")}
                  </span>
                  <Separator className="flex-1" />
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2 text-muted-foreground"
                  onClick={() => setAdminOpen((v) => !v)}
                >
                  {t("login.adminToggle")}
                  {adminOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>

                {adminOpen ? (
                  <form
                    className="space-y-3"
                    onSubmit={(e) => void signInWithPassword(e)}
                  >
                    <p className="text-xs text-muted-foreground">
                      {t("login.adminHint")}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="username">
                        {passwordMode
                          ? t("login.email")
                          : t("login.localUser")}
                      </Label>
                      <Input
                        id="username"
                        type={passwordMode ? "email" : "text"}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete={passwordMode ? "email" : "username"}
                        placeholder={
                          passwordMode ? "admin@example.com" : undefined
                        }
                        disabled={dbBlocked}
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
                        disabled={dbBlocked}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      variant="outline"
                      disabled={
                        dbBlocked ||
                        !username.trim() ||
                        !password ||
                        signingIn
                      }
                    >
                      {signingIn
                        ? t("login.localSigningIn")
                        : passwordMode
                          ? t("login.emailButton")
                          : t("login.localButton")}
                    </Button>
                  </form>
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
