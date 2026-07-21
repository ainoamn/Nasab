import { Link, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import FamilyChart from "@/components/tree/FamilyChart";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLabels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TreePalm, ShieldCheck, Lock } from "lucide-react";
import type { Person } from "@db/schema";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/** عرض عام للقراءة فقط — يحترم كل قواعد الخصوصية */
export default function ShareView() {
  const { id } = useParams<{ id: string }>();
  const treeId = parseInt(id ?? "0", 10);
  const [detail, setDetail] = useState<Person | null>(null);
  const { t } = useTranslation();
  const L = useLabels();

  const query = trpc.person.listPublic.useQuery(
    { treeId },
    { enabled: treeId > 0, retry: false },
  );

  if (query.isLoading) {
    return (
      <div className="min-h-screen p-10 space-y-4">
        <Skeleton className="h-12 w-72 mx-auto" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <Lock className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h1 className="font-display text-2xl font-bold">{t("share.privateTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("share.privateBody")}</p>
        <Button className="mt-6" asChild>
          <Link to="/">{t("share.home")}</Link>
        </Button>
      </div>
    );
  }

  const { tree, people, rels } = query.data;
  const isMember = !!tree.myRole;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <TreePalm className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-bold text-primary">{t("brand")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {isMember ? (
              <Button asChild>
                <Link to={`/trees/${treeId}`}>{t("share.openWorkspace")}</Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/login">{t("share.createYours")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold">{t("share.treeOf", { name: tree.name })}</h1>
          <p className="mt-1 text-muted-foreground">
            {[tree.tribe, tree.region].filter(Boolean).join(" — ")}
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3 text-primary" />
              {t("share.publicBadge")}
            </Badge>
            <Badge variant="secondary">{t("share.visibleCount", { count: people.length })}</Badge>
          </div>
        </div>

        <Card>
          <CardContent className="p-2">
            <FamilyChart people={people as Person[]} rels={rels} onPersonClick={(p) => setDetail(p)} />
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-sm">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{detail.givenName}</DialogTitle>
                {detail.fatherName && (
                  <DialogDescription className="font-display">{detail.fatherName}</DialogDescription>
                )}
              </DialogHeader>
              <div className="text-sm space-y-1 text-muted-foreground">
                {detail.kunya && <p>{t("share.kunyaLabel", { kunya: detail.kunya })}</p>}
                <p>{L.formatYears(detail.birthYear, detail.deathYear, detail.isLiving)}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
