import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useBuildBehind } from "@/hooks/useBuildBehind";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import { useLabels } from "@/lib/labels";
import type { InviteRole, TreeRole } from "@contracts/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowRight,
  Copy,
  Crown,
  Link2,
  MailPlus,
  Trash2,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

export default function TreeMembers() {
  const { id } = useParams<{ id: string }>();
  const treeId = parseInt(id ?? "0", 10);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const L = useLabels();
  const { liveBuild, mainSha, buildBehind, dbConfigured } = useBuildBehind();

  const [inviteRole, setInviteRole] = useState<InviteRole>("editor");
  const [expiresDays, setExpiresDays] = useState("30");
  const [lastLink, setLastLink] = useState("");
  const [removeTarget, setRemoveTarget] = useState<number | null>(null);

  const membersQuery = trpc.member.list.useQuery({ treeId }, { enabled: isAuthenticated && treeId > 0 });
  const invitesQuery = trpc.member.listInvites.useQuery(
    { treeId },
    { enabled: isAuthenticated && treeId > 0 && (membersQuery.data?.myRole === "owner" || membersQuery.data?.myRole === "admin") },
  );

  const createInviteMut = trpc.member.createInvite.useMutation({
    onSuccess: async (res) => {
      const link = `${window.location.origin}/invite/${res.token}`;
      setLastLink(link);
      await navigator.clipboard.writeText(link).catch(() => undefined);
      toast.success(t("members.created"));
      await utils.member.listInvites.invalidate({ treeId });
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeMut = trpc.member.revokeInvite.useMutation({
    onSuccess: async () => {
      toast.success(t("members.revokedOk"));
      await utils.member.listInvites.invalidate({ treeId });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateRoleMut = trpc.member.updateRole.useMutation({
    onSuccess: async () => {
      toast.success(t("members.roleChanged"));
      await utils.member.list.invalidate({ treeId });
    },
    onError: (e) => toast.error(e.message),
  });

  const removeMut = trpc.member.removeMember.useMutation({
    onSuccess: async () => {
      toast.success(t("members.removed"));
      await utils.member.list.invalidate({ treeId });
      setRemoveTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const transferMut = trpc.member.transferOwnership.useMutation({
    onSuccess: async () => {
      toast.success(t("members.transferred"));
      await utils.member.list.invalidate({ treeId });
    },
    onError: (e) => toast.error(e.message),
  });

  const myRole = membersQuery.data?.myRole as TreeRole | undefined;
  const canAdmin = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";

  if (membersQuery.isLoading) {
    return (
      <div className="min-h-screen">
        <AppHeader />
        <div className="mx-auto max-w-3xl p-6 space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  const members = membersQuery.data?.members ?? [];

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/trees/${treeId}`)}>
            <ArrowRight className="h-5 w-5 rtl:rotate-0 ltr:rotate-180" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold">{t("members.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("members.subtitle")}</p>
          </div>
        </div>

        {dbConfigured === false || buildBehind ? (
          <div
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100"
            role="status"
          >
            {dbConfigured === false ? (
              <p>{t("members.dbNotConfigured")}</p>
            ) : null}
            {buildBehind ? (
              <p className={dbConfigured === false ? "mt-1" : undefined}>
                {t("members.buildBehind", {
                  live: liveBuild,
                  main: mainSha,
                })}
              </p>
            ) : null}
            <Link
              to="/setup"
              className="mt-1 inline-block font-medium underline underline-offset-2"
            >
              {t("members.openSetup")}
            </Link>
          </div>
        ) : null}

        {/* إنشاء دعوة */}
        {canAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MailPlus className="h-5 w-5 text-primary" /> {t("members.inviteTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>{t("members.role")}</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as InviteRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["admin", "editor", "viewer"] as InviteRole[]).map((r) => (
                        <SelectItem key={r} value={r}>{L.roles[r]} — {L.roleDescriptions[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("members.expires")}</Label>
                  <Input type="number" min={1} max={90} value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button
                    className="w-full gap-2"
                    disabled={createInviteMut.isPending}
                    onClick={() =>
                      createInviteMut.mutate({
                        treeId,
                        role: inviteRole,
                        expiresInDays: parseInt(expiresDays, 10) || 30,
                      })
                    }
                  >
                    <Link2 className="h-4 w-4" />
                    {createInviteMut.isPending ? t("members.creating") : t("members.createBtn")}
                  </Button>
                </div>
              </div>
              {lastLink && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-sm" dir="ltr">
                  <code className="flex-1 truncate text-xs">{lastLink}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      void navigator.clipboard.writeText(lastLink);
                      toast.success(t("members.copied"));
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t("members.hint")}</p>
            </CardContent>
          </Card>
        )}

        {/* الأعضاء */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("members.membersCount", { count: members.length })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={m.userAvatar ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {m.userName?.charAt(0) ?? "؟"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold flex items-center gap-2">
                    {m.userName ?? t("user")}
                    {m.role === "owner" && <Crown className="h-4 w-4 text-amber-500" />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{m.userEmail}</p>
                </div>
                {canAdmin && m.role !== "owner" ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={m.role}
                      onValueChange={(v) =>
                        updateRoleMut.mutate({ treeId, memberId: m.id, role: v as TreeRole })
                      }
                    >
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(["admin", "editor", "viewer"] as TreeRole[]).map((r) => (
                          <SelectItem key={r} value={r}>{L.roles[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isOwner && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title={t("members.transferTitle")}
                        onClick={() => {
                          if (window.confirm(t("members.transferConfirm", { name: m.userName ?? "" }))) {
                            transferMut.mutate({ treeId, memberId: m.id });
                          }
                        }}
                      >
                        <UserCog className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setRemoveTarget(m.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Badge variant="secondary">{L.roles[m.role as TreeRole]}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* الدعوات المفتوحة */}
        {canAdmin && (invitesQuery.data?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("members.invites")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invitesQuery.data!.map((inv) => {
                const expired = inv.expiresAt < new Date() || inv.revoked;
                const used = !!inv.acceptedAt;
                return (
                  <div key={inv.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
                    <Badge variant={used ? "default" : expired ? "destructive" : "secondary"}>
                      {used ? t("members.used") : inv.revoked ? t("members.revoked") : expired ? t("members.expired") : t("members.active")}
                    </Badge>
                    <span className="text-muted-foreground">
                      {t("members.roleLabel", { role: L.roles[inv.role as TreeRole] })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("members.expiresAt", { date: L.formatDateOnly(inv.expiresAt) })}
                    </span>
                    <span className="flex-1" />
                    {!used && !expired && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            void navigator.clipboard.writeText(`${window.location.origin}/invite/${inv.token}`);
                            toast.success(t("members.copied"));
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => revokeMut.mutate({ id: inv.id, treeId })}
                        >
                          {t("members.revoke")}
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>

      <AlertDialog open={removeTarget !== null} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("members.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("members.removeBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t("common.goBack")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeTarget !== null && removeMut.mutate({ treeId, memberId: removeTarget })}
            >
              {t("members.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
