import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import type { SubscriptionPlan, UserRole } from "@contracts/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Pencil, Ban } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { localeTag } from "@/i18n";

function formatDate(d: Date | string | null | undefined, locale: string) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminUsers() {
  useAdmin();
  const utils = trpc.useUtils();
  const { t, i18n } = useTranslation();
  const locale = localeTag(i18n.language);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  useEffect(() => {
    const tmr = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(tmr);
  }, [search]);

  const listQuery = trpc.admin.listUsers.useQuery({
    search: debounced || undefined,
    limit: 50,
    offset: 0,
  });

  const detailQuery = trpc.admin.getUser.useQuery(
    { id: editId! },
    { enabled: editId != null },
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [planExpires, setPlanExpires] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [city, setCity] = useState("");
  const [username, setUsername] = useState("");
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    const p = detailQuery.data?.profile;
    if (!p) return;
    setName(p.name ?? "");
    setEmail(p.email ?? "");
    setPhone(p.phone ?? "");
    setRole(p.role as UserRole);
    setPlan(p.plan as SubscriptionPlan);
    setPlanExpires(
      p.planExpiresAt
        ? new Date(p.planExpiresAt).toISOString().slice(0, 10)
        : "",
    );
    setBillingEmail(p.billingEmail ?? "");
    setCity(p.city ?? "");
    setUsername(p.username ?? "");
    setIsBanned(p.isBanned ?? false);
    setBanReason(p.banReason ?? "");
  }, [detailQuery.data]);

  const updateMut = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      toast.success(t("admin.users.saved"));
      await utils.admin.listUsers.invalidate();
      if (editId) await utils.admin.getUser.invalidate({ id: editId });
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (editId == null) return;
    updateMut.mutate({
      id: editId,
      name: name.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      role,
      plan,
      planExpiresAt: planExpires ? new Date(planExpires) : null,
      billingEmail: billingEmail.trim() || null,
      city: city.trim() || null,
      username: username.trim() || null,
      isBanned,
      banReason: isBanned ? banReason.trim() || null : null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">{t("admin.users.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("admin.users.subtitle")}</p>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.users.searchPh")}
            className="pe-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        {listQuery.isLoading ? (
          <div className="p-6">
            <Skeleton className="h-48" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.users.cols.user")}</TableHead>
                <TableHead>{t("admin.users.cols.username")}</TableHead>
                <TableHead>{t("admin.users.cols.ip")}</TableHead>
                <TableHead>{t("admin.users.cols.role")}</TableHead>
                <TableHead>{t("admin.users.cols.plan")}</TableHead>
                <TableHead>{t("admin.users.cols.trees")}</TableHead>
                <TableHead>{t("admin.users.cols.joined")}</TableHead>
                <TableHead>{t("admin.users.cols.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    {t("admin.users.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                listQuery.data?.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={u.avatar ?? undefined} />
                          <AvatarFallback>{u.name?.charAt(0) ?? "?"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium truncate flex items-center gap-1">
                            {u.name ?? "—"}
                            {u.isBanned && (
                              <Badge variant="destructive" className="text-[10px]">
                                {t("admin.users.banned")}
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.email ?? "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate" dir="ltr">
                      {u.username ?? u.unionId?.slice(0, 12) ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">
                      {u.lastSignInIp ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {t(`admin.roles.${u.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`account.plans.${u.plan}`)}</Badge>
                    </TableCell>
                    <TableCell>{u.ownedTrees}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(u.createdAt, locale)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => setEditId(u.id)}
                      >
                        <Pencil className="h-4 w-4" />
                        {t("common.edit")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {listQuery.data && listQuery.data.total > 0 && (
        <p className="text-xs text-muted-foreground text-end">
          {t("admin.users.total", { count: listQuery.data.total })}
        </p>
      )}

      <Dialog open={editId != null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("admin.users.editTitle")}</DialogTitle>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="grid gap-4 py-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("account.profile.name")}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("account.profile.email")}</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("account.profile.phone")}</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
                </div>
                <div className="space-y-2">
                  <Label>{t("account.profile.billingEmail")}</Label>
                  <Input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.users.cols.role")}</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">{t("admin.roles.user")}</SelectItem>
                      <SelectItem value="admin">{t("admin.roles.admin")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.users.cols.plan")}</Label>
                  <Select value={plan} onValueChange={(v) => setPlan(v as SubscriptionPlan)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">{t("account.plans.free")}</SelectItem>
                      <SelectItem value="plus">{t("account.plans.plus")}</SelectItem>
                      <SelectItem value="print">{t("account.plans.print")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("admin.users.planExpires")}</Label>
                  <Input
                    type="date"
                    value={planExpires}
                    onChange={(e) => setPlanExpires(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("account.profile.city")}</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t("admin.users.cols.username")}</Label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>

              {detailQuery.data?.profile && (
                <div className="rounded-lg border bg-muted/30 p-3 text-xs font-mono space-y-1" dir="ltr">
                  <p>unionId: {detailQuery.data.profile.unionId}</p>
                  <p>IP: {detailQuery.data.profile.lastSignInIp ?? "—"}</p>
                  <p>{t("admin.users.registrationIp")}: {detailQuery.data.profile.registrationIp ?? "—"}</p>
                </div>
              )}

              <div className="rounded-lg border border-destructive/30 p-4 space-y-3">
                <div className="flex items-center gap-2 font-medium text-destructive">
                  <Ban className="h-4 w-4" />
                  {t("admin.users.banTitle")}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={isBanned} onCheckedChange={setIsBanned} />
                  {t("admin.users.banUser")}
                </label>
                {isBanned && (
                  <div className="space-y-2">
                    <Label>{t("admin.users.banReason")}</Label>
                    <Input
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder={t("admin.users.banReasonPh")}
                    />
                  </div>
                )}
              </div>

              {detailQuery.data && (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground space-y-1">
                  <p>
                    {t("admin.users.usageTrees")}: {detailQuery.data.usage.ownedTrees}
                  </p>
                  <p>
                    {t("admin.users.usagePersons")}: {detailQuery.data.usage.totalPersons}
                  </p>
                  <p>
                    {t("admin.users.usageInvoices")}: {detailQuery.data.invoices.length}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={updateMut.isPending || !name.trim()}>
              {updateMut.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
