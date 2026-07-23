import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useAccountProfile, useAccountUsage, useAccountInvoices } from "@/hooks/useAccount";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import AppHeader from "@/components/AppHeader";
import type { InvoiceStatus, SubscriptionPlan } from "@contracts/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  CreditCard,
  Receipt,
  Crown,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
  ArrowRight,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { localeTag } from "@/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InvoiceReceiptDocument } from "@/components/InvoiceReceiptDocument";
import { PrintableDocumentShell } from "@/components/PrintableDocumentShell";

function formatDate(d: Date | string | null | undefined, locale: string) {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
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

function planVariant(plan: SubscriptionPlan): "default" | "secondary" | "outline" {
  if (plan === "plus") return "default";
  if (plan === "print") return "secondary";
  return "outline";
}

function invoiceVariant(status: InvoiceStatus): "default" | "secondary" | "outline" {
  if (status === "paid") return "default";
  if (status === "pending") return "outline";
  return "secondary";
}

export default function AccountSettings() {
  const { isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const utils = trpc.useUtils();
  const { t, i18n } = useTranslation();
  const locale = localeTag(i18n.language);
  const [activeTab, setActiveTab] = useState("profile");
  const [couponCode, setCouponCode] = useState("");
  const [referralInput, setReferralInput] = useState("");
  const [printInvoice, setPrintInvoice] = useState<{
    id: number;
    number: string;
    description: string | null;
    amount: number;
    currency: string;
    status: string;
    issuedAt: Date | string;
    paidAt?: Date | string | null;
    planSlug?: string | null;
  } | null>(null);

  const profileQuery = useAccountProfile();
  const usageQuery = useAccountUsage();
  const invoicesQuery = useAccountInvoices(activeTab === "billing");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [addressRegion, setAddressRegion] = useState("");
  const [country, setCountry] = useState("OM");
  const [billingEmail, setBillingEmail] = useState("");

  const profile = profileQuery.data;
  const usage = usageQuery.data;

  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setPhone(profile.phone ?? "");
    setAddressLine1(profile.addressLine1 ?? "");
    setAddressLine2(profile.addressLine2 ?? "");
    setCity(profile.city ?? "");
    setAddressRegion(profile.addressRegion ?? "");
    setCountry(profile.country ?? "OM");
    setBillingEmail(profile.billingEmail ?? "");
  }, [profile]);

  const updateMut = trpc.user.updateProfile.useMutation({
    onSuccess: (data) => {
      toast.success(t("account.saved"));
      utils.user.getProfile.setData(undefined, data);
    },
    onError: (e) => toast.error(e.message),
  });

  const couponMut = trpc.user.applyCoupon.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setCouponCode("");
    },
    onError: (e) => toast.error(e.message),
  });

  const referralMut = trpc.user.applyReferralCode.useMutation({
    onSuccess: (res) => {
      toast.success(t("account.referral.applied", { name: res.referrerName ?? "" }));
      utils.user.getProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    updateMut.mutate({
      name: name.trim(),
      phone: phone.trim() || null,
      addressLine1: addressLine1.trim() || null,
      addressLine2: addressLine2.trim() || null,
      city: city.trim() || null,
      addressRegion: addressRegion.trim() || null,
      country: country.trim() || "OM",
      billingEmail: billingEmail.trim() || null,
    });
  };

  if (authLoading || profileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AppHeader />
        <div className="mx-auto max-w-4xl p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const plan = (profile?.plan ?? "free") as SubscriptionPlan;
  const invoices = invoicesQuery.data ?? [];

  return (
    <div className="min-h-screen bg-muted/30">
      <AppHeader />

      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2"
            >
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
              {t("account.backToDashboard")}
            </Link>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">{t("account.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("account.subtitle")}</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={profile?.avatar ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {profile?.name?.charAt(0) ?? "؟"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-bold truncate">{profile?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email ?? "—"}</p>
              {profile?.userNumberFormatted && (
                <p className="text-xs font-mono text-muted-foreground">{profile.userNumberFormatted}</p>
              )}
              <Badge variant={planVariant(plan)} className="mt-1">
                {t(`account.plans.${plan}`)}
              </Badge>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="profile" className="gap-2 py-2.5">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t("account.tabs.profile")}</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="gap-2 py-2.5">
              <Crown className="h-4 w-4" />
              <span className="hidden sm:inline">{t("account.tabs.subscription")}</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2 py-2.5">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">{t("account.tabs.billing")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("account.profile.title")}</CardTitle>
                <CardDescription>{t("account.profile.desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="acc-name">{t("account.profile.name")}</Label>
                    <Input
                      id="acc-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc-email">{t("account.profile.email")}</Label>
                    <div className="relative">
                      <Mail className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="acc-email"
                        value={profile?.email ?? ""}
                        disabled
                        className="pe-9 bg-muted"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{t("account.profile.emailHint")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc-phone">{t("account.profile.phone")}</Label>
                    <div className="relative">
                      <Phone className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="acc-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+968 9xxx xxxx"
                        className="pe-9"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc-billing-email">{t("account.profile.billingEmail")}</Label>
                    <Input
                      id="acc-billing-email"
                      type="email"
                      value={billingEmail}
                      onChange={(e) => setBillingEmail(e.target.value)}
                      placeholder="billing@example.com"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-medium flex items-center gap-2 mb-4">
                    <MapPin className="h-4 w-4" />
                    {t("account.profile.addressTitle")}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="acc-addr1">{t("account.profile.addressLine1")}</Label>
                      <Input
                        id="acc-addr1"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="acc-addr2">{t("account.profile.addressLine2")}</Label>
                      <Input
                        id="acc-addr2"
                        value={addressLine2}
                        onChange={(e) => setAddressLine2(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acc-city">{t("account.profile.city")}</Label>
                      <Input id="acc-city" value={city} onChange={(e) => setCity(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acc-region">{t("account.profile.region")}</Label>
                      <Input
                        id="acc-region"
                        value={addressRegion}
                        onChange={(e) => setAddressRegion(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acc-country">{t("account.profile.country")}</Label>
                      <Input
                        id="acc-country"
                        value={country}
                        onChange={(e) => setCountry(e.target.value.toUpperCase())}
                        maxLength={2}
                        dir="ltr"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-4">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {t("account.profile.memberSince")}: {formatDate(profile?.createdAt, locale)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {t("account.profile.lastSignIn")}: {formatDate(profile?.lastSignInAt, locale)}
                  </span>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={updateMut.isPending || !name.trim()}>
                    {updateMut.isPending ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscription">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    {t("account.subscription.currentPlan")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge variant={planVariant(plan)} className="text-sm px-3 py-1">
                      {t(`account.plans.${plan}`)}
                    </Badge>
                    {profile?.planStartedAt && plan !== "free" && (
                      <span className="text-sm text-muted-foreground">
                        {t("account.subscription.started")}:{" "}
                        {formatDate(profile.planStartedAt, locale)}
                      </span>
                    )}
                    {profile?.planExpiresAt && plan !== "free" && (
                      <span className="text-sm text-muted-foreground">
                        {t("account.subscription.expires")}:{" "}
                        {formatDate(profile.planExpiresAt, locale)}
                      </span>
                    )}
                  </div>

                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm font-medium mb-2">{t("account.subscription.usage")}</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>
                        {t("account.subscription.ownedTrees")}: {usage?.ownedTrees ?? 0}
                        {usage?.maxTrees != null && (
                          <span> / {usage.maxTrees}</span>
                        )}
                        {usage?.maxTrees == null && usage?.planLimits && (
                          <span className="text-xs"> ({t("account.subscription.limitUnlimited")})</span>
                        )}
                      </li>
                      <li>
                        {t("account.subscription.sharedTrees")}: {usage?.sharedTrees ?? 0}
                      </li>
                      <li>
                        {t("account.subscription.totalPersons")}: {usage?.totalPersons ?? 0}
                        {usage?.personLimit != null && (
                          <span> / {usage.personLimit}</span>
                        )}
                      </li>
                      {usage?.maxPersonsPerTree != null && (
                        <li>
                          {t("account.subscription.maxPersonsPerTree")}: {usage.maxPersonsPerTree}
                        </li>
                      )}
                    </ul>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {t(`account.subscription.planDesc.${plan}`)}
                  </p>

                  {plan === "free" && (
                    <Button asChild className="gap-2">
                      <Link to="/checkout?plan=plus">
                        {t("account.subscription.upgrade")}
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {plan !== "free" && (
                    <Button asChild variant="outline" className="gap-2">
                      <Link to={`/checkout?plan=${plan}`}>
                        {t("checkout.renew")}
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("account.coupon.title")}</CardTitle>
                  <CardDescription>{t("account.coupon.desc")}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder={t("account.coupon.ph")}
                    dir="ltr"
                    className="font-mono"
                  />
                  <Button
                    onClick={() =>
                      couponMut.mutate({
                        code: couponCode,
                        context: plan === "free" ? "new" : "renewal",
                        planSlug: plan !== "free" ? plan : "plus",
                      })
                    }
                    disabled={!couponCode.trim() || couponMut.isPending}
                  >
                    {t("account.coupon.apply")}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("account.referral.title")}</CardTitle>
                  <CardDescription>{t("account.referral.desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {profile?.referralCode && (
                    <div className="rounded-lg border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{t("account.referral.yourCode")}</p>
                      <p className="font-mono font-bold text-lg">{profile.referralCode}</p>
                    </div>
                  )}
                  {!profile?.referredByUserId && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={referralInput}
                        onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                        placeholder={t("account.referral.ph")}
                        dir="ltr"
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        onClick={() => referralMut.mutate({ code: referralInput })}
                        disabled={!referralInput.trim() || referralMut.isPending}
                      >
                        {t("account.referral.apply")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("account.billing.paymentMethod")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                    <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">{t("account.billing.noPaymentMethod")}</p>
                    <p className="text-sm mt-1">{t("account.billing.noPaymentMethodDesc")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    {t("account.billing.invoices")}
                  </CardTitle>
                  <CardDescription>{t("account.billing.invoicesDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {invoicesQuery.isLoading ? (
                    <Skeleton className="h-32 rounded-lg" />
                  ) : invoices.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                      <Receipt className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">{t("account.billing.noInvoices")}</p>
                      <p className="text-sm mt-1">{t("account.billing.noInvoicesDesc")}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("account.billing.cols.number")}</TableHead>
                            <TableHead>{t("account.billing.cols.description")}</TableHead>
                            <TableHead>{t("account.billing.cols.amount")}</TableHead>
                            <TableHead>{t("account.billing.cols.status")}</TableHead>
                            <TableHead>{t("account.billing.cols.date")}</TableHead>
                            <TableHead className="w-12" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoices.map((inv) => (
                            <TableRow key={inv.id}>
                              <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                              <TableCell>{inv.description}</TableCell>
                              <TableCell>
                                {formatAmount(inv.amount, inv.currency, locale)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={invoiceVariant(inv.status as InvoiceStatus)}>
                                  {t(`account.billing.status.${inv.status}`)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(inv.issuedAt, locale)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPrintInvoice(inv)}
                                  aria-label={t("admin.invoices.printReceipt")}
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={printInvoice != null} onOpenChange={(open) => !open && setPrintInvoice(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader className="no-print">
              <DialogTitle>{t("admin.invoices.printReceipt")}</DialogTitle>
            </DialogHeader>
            {printInvoice && (
              <PrintableDocumentShell
                title={`${t("admin.company.receiptTitle")} ${printInvoice.number}`}
              >
                <InvoiceReceiptDocument
                  invoice={{
                    ...printInvoice,
                    userName: profile?.name ?? null,
                    userEmail: profile?.billingEmail ?? profile?.email ?? null,
                  }}
                />
              </PrintableDocumentShell>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
