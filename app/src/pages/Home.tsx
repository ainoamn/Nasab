import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  TreePalm,
  ShieldCheck,
  Users,
  FileSpreadsheet,
  Printer,
  ScrollText,
  History,
  BookOpen,
  Map,
  Landmark,
  Gift,
  Frame,
  Layers,
  Sparkles,
  Check,
  ChevronDown,
} from "lucide-react";

const featureIcons = [ScrollText, ShieldCheck, Users, FileSpreadsheet, History, Printer];
const designIcons = [TreePalm, ScrollText, BookOpen, Frame, Map, Landmark, Gift, Sparkles];
const planSlugs = ["free", "plus", "print"] as const;
const GITHUB_MAIN_SHA =
  "https://api.github.com/repos/ainoamn/Nasab/commits/main";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [liveBuild, setLiveBuild] = useState<string | null>(null);
  const [mainSha, setMainSha] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/diag")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { build?: string | null } | null) => {
        if (!cancelled && d?.build) setLiveBuild(d.build);
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(GITHUB_MAIN_SHA, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { sha?: string } | null) => {
        if (!cancelled && d?.sha) setMainSha(d.sha.slice(0, 7));
      })
      .catch(() => {
        /* optional */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const buildBehind = Boolean(liveBuild && mainSha && liveBuild !== mainSha);

  const featuresRaw = t("features.items", { returnObjects: true });
  const designsRaw = t("printDesigns.items", { returnObjects: true });
  const privacyPointsRaw = t("privacySec.points", { returnObjects: true });
  const privacyLevelsRaw = t("privacySec.levels", { returnObjects: true });
  const plansRaw = t("pricingSec.plans", { returnObjects: true });

  const features = (Array.isArray(featuresRaw) ? featuresRaw : []) as Array<{ title: string; desc: string }>;
  const designs = (Array.isArray(designsRaw) ? designsRaw : []) as Array<{ name: string; desc: string }>;
  const privacyPoints = (Array.isArray(privacyPointsRaw) ? privacyPointsRaw : []) as string[];
  const privacyLevels = (Array.isArray(privacyLevelsRaw) ? privacyLevelsRaw : []) as Array<{ t: string; d: string }>;
  const plans = (Array.isArray(plansRaw) ? plansRaw : []) as Array<{
    name: string;
    price: string;
    period: string;
    features: string[];
  }>;

  return (
    <div className="min-h-screen bg-background">
      {/* الترويسة */}
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TreePalm className="h-5 w-5" />
            </span>
            <span className="font-display text-xl sm:text-2xl font-bold text-primary truncate">{t("brand")}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-primary transition">{t("nav.features")}</a>
            <a href="#print" className="hover:text-primary transition">{t("nav.print")}</a>
            <a href="#privacy" className="hover:text-primary transition">{t("nav.privacy")}</a>
            <a href="#pricing" className="hover:text-primary transition">{t("nav.pricing")}</a>
          </nav>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Button size="sm" asChild><Link to="/dashboard">{t("nav.myTrees")}</Link></Button>
            ) : (
              <>
                <Button size="sm" variant="ghost" asChild><Link to="/login">{t("nav.login")}</Link></Button>
                <Button size="sm" asChild className="hidden sm:inline-flex"><Link to="/login">{t("nav.startFree")}</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* البطل */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:py-20 md:py-28 text-center">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 sm:px-4 py-1.5 text-xs sm:text-sm text-primary font-medium">
            <Sparkles className="h-4 w-4" />
            {t("hero.badge")}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold leading-tight text-foreground text-balance">
            {t("hero.title1")}
            <br />
            <span className="text-primary">{t("hero.title2")}</span>
          </h1>
          <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed text-pretty">
            {t("hero.subtitle")}
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-3">
            <Button size="lg" asChild className="text-base px-8 w-full sm:w-auto">
              <Link to={isAuthenticated ? "/dashboard" : "/login"}>{t("hero.start")}</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-base w-full sm:w-auto">
              <a href="#features">{t("hero.how")} <ChevronDown className="h-4 w-4" /></a>
            </Button>
          </div>
          {buildBehind ? (
            <p
              className="mx-auto mt-5 max-w-xl rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
              role="status"
            >
              {t("hero.buildBehind", { live: liveBuild, main: mainSha })}{" "}
              <Link to="/setup" className="font-medium underline underline-offset-2">
                {t("hero.buildBehindCta")}
              </Link>
            </p>
          ) : null}
          <p className="mt-4 text-sm text-muted-foreground text-pretty px-2">{t("hero.points")}</p>
        </div>
      </section>

      {/* المميزات */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="font-display text-3xl md:text-4xl font-bold text-center">{t("features.title")}</h2>
        <p className="mt-3 text-center text-muted-foreground max-w-xl mx-auto">{t("features.subtitle")}</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = featureIcons[i % featureIcons.length];
            return (
              <Card key={f.title} className="hover:shadow-md hover:border-primary/30 transition">
                <CardContent className="p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* الطباعة */}
      <section id="print" className="bg-primary/[0.04] border-y">
        <div className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center">{t("printDesigns.title")}</h2>
          <p className="mt-3 text-center text-muted-foreground max-w-2xl mx-auto">{t("printDesigns.subtitle")}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {designs.map((d, i) => {
              const Icon = designIcons[i % designIcons.length];
              return (
                <Card key={d.name} className="bg-card hover:shadow-md transition">
                  <CardContent className="p-5">
                    <Icon className="h-7 w-7 text-primary mb-3" />
                    <h3 className="font-bold">{d.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* الخصوصية */}
      <section id="privacy" className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold">{t("privacySec.title")}</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t("privacySec.body")}</p>
            <ul className="mt-6 space-y-3">
              {privacyPoints.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="border-primary/20 shadow-lg">
            <CardContent className="p-8">
              <Layers className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-bold text-xl mb-4">{t("privacySec.cardTitle")}</h3>
              <div className="space-y-3">
                {privacyLevels.map((lvl, i) => (
                  <div key={lvl.t} className="flex items-center gap-3 rounded-lg border p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{lvl.t}</p>
                      <p className="text-xs text-muted-foreground">{lvl.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* الاشتراك */}
      <section id="pricing" className="bg-primary/[0.04] border-y">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-center">{t("pricingSec.title")}</h2>
          <p className="mt-3 text-center text-muted-foreground">{t("pricingSec.subtitle")}</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {plans.map((plan, i) => (
              <Card key={plan.name} className={`border-2 ${i === 1 ? "border-primary shadow-lg relative" : ""}`}>
                {i === 1 && (
                  <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground font-medium">
                    {t("pricingSec.popular")}
                  </span>
                )}
                <CardContent className="p-6 text-center">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="font-display text-4xl font-bold text-primary mt-2">{plan.price}</p>
                  <p className="text-sm text-muted-foreground">{plan.period}</p>
                  <ul className="mt-4 space-y-2 text-sm text-start">
                    {plan.features.map((x) => (
                      <li key={x} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />{x}
                      </li>
                    ))}
                  </ul>
                  {planSlugs[i] !== "free" && (
                    <Button asChild className="mt-6 w-full" variant={i === 1 ? "default" : "outline"}>
                      <Link to={isAuthenticated ? `/checkout?plan=${planSlugs[i]}` : "/login"}>
                        {t("checkout.subscribe")}
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ختام */}
      <section className="mx-auto max-w-7xl px-4 py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl font-bold">{t("ctaSec.title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("ctaSec.subtitle")}</p>
        <Button size="lg" asChild className="mt-6 text-base px-10">
          <Link to={isAuthenticated ? "/dashboard" : "/login"}>{t("ctaSec.button")}</Link>
        </Button>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <TreePalm className="h-4 w-4 text-primary" />
            <span className="font-display font-bold text-primary">{t("brand")}</span>
          </div>
          <p>{t("footer")}</p>
          <Link to="/setup" className="text-xs underline underline-offset-2 hover:text-foreground">
            {t("setupLink")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
