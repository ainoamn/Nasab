import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import type { InvoiceStatus } from "@contracts/constants";
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
import { Plus, Pencil } from "lucide-react";
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

function formatAmount(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 3,
  }).format(amount / 1000);
}

function invoiceVariant(status: InvoiceStatus): "default" | "secondary" | "outline" {
  if (status === "paid") return "default";
  if (status === "pending") return "outline";
  return "secondary";
}

export default function AdminInvoices() {
  useAdmin();
  const utils = trpc.useUtils();
  const { t, i18n } = useTranslation();
  const locale = localeTag(i18n.language);

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const listQuery = trpc.admin.listInvoices.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
    offset: 0,
  });

  const usersQuery = trpc.admin.listUsers.useQuery({ limit: 100, offset: 0 });

  const [newUserId, setNewUserId] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newStatus, setNewStatus] = useState<InvoiceStatus>("pending");

  const [editStatus, setEditStatus] = useState<InvoiceStatus>("pending");
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const createMut = trpc.admin.createInvoice.useMutation({
    onSuccess: async () => {
      toast.success(t("admin.invoices.created"));
      await utils.admin.listInvoices.invalidate();
      await utils.admin.getStats.invalidate();
      setCreateOpen(false);
      setNewUserId("");
      setNewDesc("");
      setNewAmount("");
      setNewStatus("pending");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = trpc.admin.updateInvoice.useMutation({
    onSuccess: async () => {
      toast.success(t("admin.invoices.updated"));
      await utils.admin.listInvoices.invalidate();
      await utils.admin.getStats.invalidate();
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openEdit = (inv: NonNullable<typeof listQuery.data>["items"][number]) => {
    setEditId(inv.id);
    setEditStatus(inv.status as InvoiceStatus);
    setEditDesc(inv.description);
    setEditAmount(String(inv.amount / 1000));
  };

  const handleCreate = () => {
    const userId = parseInt(newUserId, 10);
    const amount = Math.round(parseFloat(newAmount) * 1000);
    if (!userId || !newDesc.trim() || !amount || amount <= 0) {
      toast.error(t("admin.invoices.validation"));
      return;
    }
    createMut.mutate({
      userId,
      description: newDesc.trim(),
      amount,
      status: newStatus,
    });
  };

  const handleUpdate = () => {
    if (editId == null) return;
    const amount = Math.round(parseFloat(editAmount) * 1000);
    if (!editDesc.trim() || !amount || amount <= 0) {
      toast.error(t("admin.invoices.validation"));
      return;
    }
    updateMut.mutate({
      id: editId,
      description: editDesc.trim(),
      amount,
      status: editStatus,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold">{t("admin.invoices.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("admin.invoices.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.invoices.filterAll")}</SelectItem>
              <SelectItem value="paid">{t("account.billing.status.paid")}</SelectItem>
              <SelectItem value="pending">{t("account.billing.status.pending")}</SelectItem>
              <SelectItem value="cancelled">{t("account.billing.status.cancelled")}</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("admin.invoices.create")}
          </Button>
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
                <TableHead>{t("account.billing.cols.number")}</TableHead>
                <TableHead>{t("admin.invoices.cols.user")}</TableHead>
                <TableHead>{t("account.billing.cols.description")}</TableHead>
                <TableHead>{t("account.billing.cols.amount")}</TableHead>
                <TableHead>{t("account.billing.cols.status")}</TableHead>
                <TableHead>{t("account.billing.cols.date")}</TableHead>
                <TableHead>{t("admin.users.cols.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {t("admin.invoices.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                listQuery.data?.items.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                    <TableCell>
                      <p className="font-medium truncate max-w-[140px]">{inv.userName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {inv.userEmail ?? "—"}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{inv.description}</TableCell>
                    <TableCell>{formatAmount(inv.amount, inv.currency, locale)}</TableCell>
                    <TableCell>
                      <Badge variant={invoiceVariant(inv.status as InvoiceStatus)}>
                        {t(`account.billing.status.${inv.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(inv.issuedAt, locale)}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(inv)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.invoices.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("admin.invoices.cols.user")}</Label>
              <Select value={newUserId} onValueChange={setNewUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("admin.invoices.pickUser")} />
                </SelectTrigger>
                <SelectContent>
                  {usersQuery.data?.items.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name ?? u.email ?? `#${u.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("account.billing.cols.description")}</Label>
              <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.invoices.amountOmr")}</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("account.billing.cols.status")}</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as InvoiceStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("account.billing.status.pending")}</SelectItem>
                  <SelectItem value="paid">{t("account.billing.status.paid")}</SelectItem>
                  <SelectItem value="cancelled">{t("account.billing.status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? t("common.saving") : t("admin.invoices.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editId != null} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.invoices.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("account.billing.cols.description")}</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.invoices.amountOmr")}</Label>
              <Input
                type="number"
                step="0.001"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("account.billing.cols.status")}</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as InvoiceStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t("account.billing.status.pending")}</SelectItem>
                  <SelectItem value="paid">{t("account.billing.status.paid")}</SelectItem>
                  <SelectItem value="cancelled">{t("account.billing.status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>
              {updateMut.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
