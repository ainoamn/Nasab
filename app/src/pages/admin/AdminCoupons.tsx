import { useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function AdminCoupons() {
  useAdmin();
  const utils = trpc.useUtils();
  const { t } = useTranslation();

  const couponsQuery = trpc.admin.listCoupons.useQuery();
  const [code, setCode] = useState("");
  const [discountValue, setDiscountValue] = useState("10");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [appliesTo, setAppliesTo] = useState<"new" | "renewal" | "all">("all");

  const createMut = trpc.admin.createCoupon.useMutation({
    onSuccess: async () => {
      toast.success(t("admin.coupons.created"));
      await utils.admin.listCoupons.invalidate();
      setCode("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = () => {
    const val =
      discountType === "percent"
        ? parseInt(discountValue, 10)
        : Math.round(parseFloat(discountValue) * 1000);
    if (!code.trim() || !val || val <= 0) {
      toast.error(t("admin.invoices.validation"));
      return;
    }
    createMut.mutate({
      code: code.trim(),
      discountType,
      discountValue: val,
      appliesTo,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold">{t("admin.coupons.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin.coupons.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.coupons.create")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>{t("admin.coupons.code")}</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.coupons.type")}</Label>
            <Select value={discountType} onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">{t("admin.coupons.percent")}</SelectItem>
                <SelectItem value="fixed">{t("admin.coupons.fixed")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("admin.coupons.value")}</Label>
            <Input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label>{t("admin.coupons.appliesTo")}</Label>
            <Select value={appliesTo} onValueChange={(v) => setAppliesTo(v as "new" | "renewal" | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.coupons.all")}</SelectItem>
                <SelectItem value="new">{t("admin.coupons.newSub")}</SelectItem>
                <SelectItem value="renewal">{t("admin.coupons.renewal")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Button className="gap-2" onClick={handleCreate} disabled={createMut.isPending}>
              <Plus className="h-4 w-4" /> {t("admin.coupons.create")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin.coupons.code")}</TableHead>
              <TableHead>{t("admin.coupons.type")}</TableHead>
              <TableHead>{t("admin.coupons.appliesTo")}</TableHead>
              <TableHead>{t("admin.coupons.uses")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(couponsQuery.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {t("admin.coupons.empty")}
                </TableCell>
              </TableRow>
            ) : (
              couponsQuery.data?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold">{c.code}</TableCell>
                  <TableCell>
                    {c.discountType === "percent"
                      ? `${c.discountValue}%`
                      : `${(c.discountValue / 1000).toFixed(3)} ${t("common.currencyOmr")}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t(`admin.coupons.${c.appliesTo === "all" ? "all" : c.appliesTo === "new" ? "newSub" : "renewal"}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.usedCount}
                    {c.maxUses != null ? ` / ${c.maxUses}` : ""}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
