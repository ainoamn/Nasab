import { useState, useEffect, useRef, type FormEvent } from "react";
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

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, cfg: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const utils = trpc.useUtils();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const { liveBuild, mainSha, buildBehind, dbConfigured } = useBuildBehind();

  const authConfig = trpc.auth.config.useQuery();
  const googleEnabled = Boolean(authConfig.data?.googleEnabled);
  const googleClientId = authConfig.data?.googleClientId || "";
  const showPasswordForm = authConfig.data?.passwordLogin !== false;
  const passwordMode = !authConfig.data?.devLocalAuth;
  const dbBlocked = dbConfigured === false;

  useEffect(() => {
    if (params.get("error") === "google") {
      toast.error(t("login.googleError"));
    }
  }, [params, t]);

  useEffect(() => {
    if (!googleEnabled || !googleClientId || dbBlocked) return;
    let cancelled = false;

    async function handleCredential(response: { credential?: string }) {
      const credential = response.credential;
      if (!credential) {
        toast.error(t("login.googleError"));
        return;
      }
      setSigningIn(true);
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ credential }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
        };
        if (!res.ok || !data.success) {
          toast.error(data.message || t("login.googleError"));
          return;
        }
        toast.success(t("login.localSuccess"));
        await utils.auth.me.invalidate();
        navigate("/dashboard");
      } catch {
        toast.error(t("login.googleError"));
      } finally {
        setSigningIn(false);
      }
    }

    function renderGoogle() {
      if (cancelled || !googleBtnRef.current || !window.google?.accounts?.id) {
        return;
      }
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredential,
        ux_mode: "popup",
        auto_select: false,
      });
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width: 320,
        locale: i18n.language?.startsWith("ar") ? "ar" : "en",
      });
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-nasab-google="1"]',
    );
    if (existing) {
      if (window.google?.accounts?.id) renderGoogle();
      else existing.addEventListener("load", renderGoogle);
      return () => {
        cancelled = true;
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.nasabGoogle = "1";
    script.onload = () => renderGoogle();
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [
    googleEnabled,
    googleClientId,
    dbBlocked,
    i18n.language,
    navigate,
    t,
    utils.auth.me,
  ]);

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
        error?: string;
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
              <div className="flex flex-col items-center gap-2">
                <div ref={googleBtnRef} className="min-h-10 w-full flex justify-center" />
                {signingIn ? (
                  <p className="text-xs text-muted-foreground">
                    {t("login.localSigningIn")}
                  </p>
                ) : null}
              </div>
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
