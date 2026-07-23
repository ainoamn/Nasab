import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import type { ExpenseCategory } from "@contracts/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Banknote, TrendingDown, TrendingUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { localeTag } from "@/i18n";
import { CompanyDocumentHeader } from "@/components/CompanyDocumentHeader";
import { PrintableDocumentShell } from "@/components/PrintableDocumentShell";

function formatMoney(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "OMR",
    minimumFractionDigits: 3,
  }).format(amount / 1000);
}

function formatDate(d: Date | string, locale: string) {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminAccounting() {
  useAdmin();
  const utils = trpc.useUtils();
  const { t, i18n } = useTranslation();
  const locale = localeTag(i18n.language);

  const accountingQuery = trpc.admin.getAccounting.useQuery();
  const expensesQuery = trpc.admin.listExpenses.useQuery({ limit: 50, offset: 0 });

  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const createMut = trpc.admin.createExpense.useMutation({
    onSuccess: async () => {
      toast.success(t("admin.accounting.expenseCreated"));
      await utils.admin.getAccounting.invalidate();
      await utils.admin.listExpenses.invalidate();
      await utils.admin.getStats.invalidate();
      setOpen(false);
      setDesc("");
      setAmount("");
      setNotes("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = trpc.admin.deleteExpense.useMutation({
    onSuccess: async () => {
      toast.success(t("admin.accounting.expenseDeleted"));
      await utils.admin.getAccounting.invalidate();
      await utils.admin.listExpenses.invalidate();
      await utils.admin.getStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    const amt = Math.round(parseFloat(amount) * 1000);
    if (!desc.trim() || !amt || amt <= 0) {
      toast.error(t("admin.invoices.validation"));
      return;
    }
    createMut.mutate({
      description: desc.trim(),
      amount: amt,
      category,
      incurredAt: new Date(date),
      notes: notes.trim() || null,
    });
  };

  if (accountingQuery.isLoading) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  const a = accountingQuery.data;
  if (!a) return null;

  return (
    <PrintableDocumentShell title={t("admin.company.reportTitle")}>
      <CompanyDocumentHeader showContact />
      <div className="space-y-6 no-print-header-adjust">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <h2 className="font-display text-xl font-bold">{t("admin.accounting.title")}</h2>
          <p className="text-sm text-muted-foreground">{t("admin.accounting.subtitle")}</p>
        </div>
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("admin.accounting.addExpense")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              {t("admin.accounting.revenue")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(a.revenue, locale)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("admin.accounting.pending")}: {formatMoney(a.pending, locale)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              {t("admin.accounting.expenses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatMoney(a.expenses, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Banknote className="h-4 w-4 text-primary" />
              {t("admin.accounting.profit")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${a.profit >= 0 ? "text-green-700" : "text-red-700"}`}>
              {formatMoney(a.profit, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.accounting.expensesList")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("account.billing.cols.date")}</TableHead>
                  <TableHead>{t("account.billing.cols.description")}</TableHead>
                  <TableHead>{t("admin.accounting.category")}</TableHead>
                  <TableHead>{t("account.billing.cols.amount")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expensesQuery.data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t("admin.accounting.noExpenses")}
                    </TableCell>
                  </TableRow>
                ) : (
                  expensesQuery.data?.items.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{formatDate(e.incurredAt, locale)}</TableCell>
                      <TableCell>{e.description}</TableCell>
                      <TableCell>{t(`admin.accounting.categories.${e.category}`)}</TableCell>
                      <TableCell>{formatMoney(e.amount, locale)}</TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteMut.mutate({ id: e.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.accounting.addExpense")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>{t("account.billing.cols.description")}</Label>
              <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.invoices.amountOmr")}</Label>
              <Input
                type="number"
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.accounting.category")}</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["hosting", "marketing", "salaries", "operations", "other"] as const).map(
                    (c) => (
                      <SelectItem key={c} value={c}>
                        {t(`admin.accounting.categories.${c}`)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("account.billing.cols.date")}</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-2">
              <Label>{t("admin.accounting.notes")}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>
              {createMut.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PrintableDocumentShell>
  );
}
