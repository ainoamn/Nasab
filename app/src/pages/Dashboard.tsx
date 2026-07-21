import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import { useLabels } from "@/lib/labels";
import type { TreeRole, TreeStatus } from "@contracts/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TreePalm,
  Plus,
  Users,
  MapPin,
  Crown,
  MoreVertical,
  ExternalLink,
  Pause,
  Play,
  Archive,
  ArchiveRestore,
  Trash2,
  UserCircle,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TreeRow = {
  id: number;
  name: string;
  tribe: string | null;
  region: string | null;
  myRole: string;
  personCount: number;
  status: string;
};

function statusVariant(status: TreeStatus): "default" | "secondary" | "outline" {
  if (status === "active") return "default";
  if (status === "paused") return "outline";
  return "secondary";
}

export default function Dashboard() {
  const { isAuthenticated, isLoading, user } = useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const L = useLabels();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tribe, setTribe] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<TreeRow | null>(null);
  const [showArchived, setShowArchived] = useState(true);

  const treesQuery = trpc.tree.listMine.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const accountQuery = trpc.user.getAccount.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMut = trpc.tree.create.useMutation({
    onSuccess: async (res) => {
      toast.success(t("dashboard.dialog.created"));
      await utils.tree.listMine.invalidate();
      setOpen(false);
      setName("");
      setTribe("");
      setRegion("");
      setDescription("");
      navigate(`/trees/${res.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const statusMut = trpc.tree.setStatus.useMutation({
    onSuccess: async (_data, vars) => {
      toast.success(t(`dashboard.status.${vars.status}Done`));
      await utils.tree.listMine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.tree.remove.useMutation({
    onSuccess: async () => {
      toast.success(t("dashboard.status.deletedDone"));
      await utils.tree.listMine.invalidate();
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="mx-auto max-w-6xl p-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const trees = treesQuery.data ?? [];
  const owned = trees.filter((tr) => tr.myRole === "owner");
  const shared = trees.filter((tr) => tr.myRole !== "owner");
  const archivedCount = trees.filter((tr) => tr.status === "archived").length;

  const renderTreeCard = (tr: TreeRow) => {
    const status = (tr.status ?? "active") as TreeStatus;
    const isOwner = tr.myRole === "owner";
    const canOpen = status !== "archived";

    return (
      <Card
        key={tr.id}
        className={cn(
          "h-full transition",
          canOpen && "hover:shadow-md hover:border-primary/40",
          status === "archived" && "opacity-75 border-dashed",
          status === "paused" && "border-amber-300/60",
        )}
      >
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TreePalm className="h-5 w-5" />
            </span>
            <div className="flex items-center gap-1">
              <Badge variant={statusVariant(status)}>
                {t(`dashboard.status.${status}`)}
              </Badge>
              <Badge variant="secondary">{L.roles[tr.myRole as TreeRole]}</Badge>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t("dashboard.actions.menu")}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {canOpen && (
                      <DropdownMenuItem onClick={() => navigate(`/trees/${tr.id}`)}>
                        <ExternalLink className="h-4 w-4" />
                        {t("dashboard.actions.open")}
                      </DropdownMenuItem>
                    )}
                    {status === "active" && (
                      <DropdownMenuItem
                        onClick={() =>
                          statusMut.mutate({ id: tr.id, status: "paused" })
                        }
                      >
                        <Pause className="h-4 w-4" />
                        {t("dashboard.actions.pause")}
                      </DropdownMenuItem>
                    )}
                    {status === "paused" && (
                      <DropdownMenuItem
                        onClick={() =>
                          statusMut.mutate({ id: tr.id, status: "active" })
                        }
                      >
                        <Play className="h-4 w-4" />
                        {t("dashboard.actions.resume")}
                      </DropdownMenuItem>
                    )}
                    {status !== "archived" && (
                      <DropdownMenuItem
                        onClick={() =>
                          statusMut.mutate({ id: tr.id, status: "archived" })
                        }
                      >
                        <Archive className="h-4 w-4" />
                        {t("dashboard.actions.archive")}
                      </DropdownMenuItem>
                    )}
                    {status === "archived" && (
                      <DropdownMenuItem
                        onClick={() =>
                          statusMut.mutate({ id: tr.id, status: "active" })
                        }
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        {t("dashboard.actions.restore")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setConfirmDelete(tr)}
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("dashboard.actions.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {canOpen ? (
            <Link to={`/trees/${tr.id}`} className="block mt-3 group">
              <h3 className="font-display text-xl font-bold group-hover:text-primary transition-colors">
                {tr.name}
              </h3>
            </Link>
          ) : (
            <h3 className="mt-3 font-display text-xl font-bold text-muted-foreground">
              {tr.name}
            </h3>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {tr.tribe && <span>{tr.tribe}</span>}
            {tr.region && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {tr.region}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {L.personCount(tr.personCount)}
          </p>
          {status === "paused" && (
            <p className="mt-2 text-xs text-amber-700">{t("dashboard.status.pausedHint")}</p>
          )}
          {status === "archived" && isOwner && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("dashboard.status.archivedHint")}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const filterList = (list: TreeRow[]) =>
    showArchived ? list : list.filter((tr) => tr.status !== "archived");

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold">
              {t("dashboard.title")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("dashboard.subtitle")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
            {user?.role === "admin" && (
              <Button variant="outline" asChild className="gap-2 w-full sm:w-auto border-destructive/40 text-destructive hover:text-destructive">
                <Link to="/admin">
                  <Shield className="h-4 w-4" /> {t("nav.admin")}
                </Link>
              </Button>
            )}
            <Button variant="outline" asChild className="gap-2 w-full sm:w-auto">
              <Link to="/account">
                <UserCircle className="h-4 w-4" /> {t("nav.account")}
              </Link>
            </Button>
            <Button onClick={() => setOpen(true)} className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" /> {t("dashboard.newTree")}
            </Button>
          </div>
        </div>

        {accountQuery.data && (
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold truncate">{accountQuery.data.profile.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {accountQuery.data.profile.email ?? "—"}
                    {" · "}
                    {t(`account.plans.${accountQuery.data.profile.plan ?? "free"}`)}
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" asChild className="shrink-0">
                <Link to="/account">{t("dashboard.accountCard.viewDetails")}</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {archivedCount > 0 && (
          <div className="mb-4 flex items-center gap-2">
            <Button
              size="sm"
              variant={showArchived ? "secondary" : "outline"}
              onClick={() => setShowArchived((v) => !v)}
            >
              <Archive className="h-4 w-4" />
              {showArchived
                ? t("dashboard.hideArchived")
                : t("dashboard.showArchived", { count: archivedCount })}
            </Button>
          </div>
        )}

        {treesQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : trees.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <TreePalm className="h-14 w-14 text-primary/40 mb-4" />
              <h2 className="font-display text-2xl font-bold">
                {t("dashboard.emptyTitle")}
              </h2>
              <p className="text-muted-foreground mt-2 max-w-md">
                {t("dashboard.emptyBody")}
              </p>
              <Button onClick={() => setOpen(true)} className="mt-6 gap-2">
                <Plus className="h-4 w-4" /> {t("dashboard.createFirst")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {[
              { title: t("dashboard.owned"), list: filterList(owned), icon: Crown },
              { title: t("dashboard.shared"), list: filterList(shared), icon: Users },
            ].map(
              (section) =>
                section.list.length > 0 && (
                  <div key={section.title}>
                    <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
                      <section.icon className="h-4 w-4" /> {section.title}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {section.list.map((tr) => renderTreeCard(tr as TreeRow))}
                    </div>
                  </div>
                ),
            )}
          </div>
        )}
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {t("dashboard.dialog.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("dashboard.dialog.name")} *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("dashboard.dialog.namePh")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("dashboard.dialog.tribe")}</Label>
                <Input
                  value={tribe}
                  onChange={(e) => setTribe(e.target.value)}
                  placeholder={t("dashboard.dialog.tribePh")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("dashboard.dialog.region")}</Label>
                <Input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder={t("dashboard.dialog.regionPh")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("dashboard.dialog.desc")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder={t("dashboard.dialog.descPh")}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() =>
                createMut.mutate({
                  name: name.trim(),
                  tribe: tribe.trim() || undefined,
                  region: region.trim() || undefined,
                  description: description.trim() || undefined,
                })
              }
              disabled={!name.trim() || createMut.isPending}
            >
              {createMut.isPending
                ? t("dashboard.dialog.creating")
                : t("dashboard.dialog.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.delete.body", { name: confirmDelete?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                confirmDelete && deleteMut.mutate({ id: confirmDelete.id })
              }
            >
              {t("dashboard.actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
