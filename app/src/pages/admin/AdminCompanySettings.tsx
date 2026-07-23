import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { trpc } from "@/providers/trpc";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CompanyDocumentHeader } from "@/components/CompanyDocumentHeader";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

const LOGO_MAX_BYTES = 500_000;

export default function AdminCompanySettings() {
  useAdmin();
  const utils = trpc.useUtils();
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const settingsQuery = trpc.admin.getCompanySettings.useQuery();

  const [companyNameAr, setCompanyNameAr] = useState("");
  const [companyNameEn, setCompanyNameEn] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setCompanyNameAr(s.companyNameAr ?? "");
    setCompanyNameEn(s.companyNameEn ?? "");
    setLogoUrl(s.logoUrl);
    setAddress(s.address ?? "");
    setPhone(s.phone ?? "");
    setEmail(s.email ?? "");
    setTaxNumber(s.taxNumber ?? "");
  }, [settingsQuery.data]);

  const saveMut = trpc.admin.updateCompanySettings.useMutation({
    onSuccess: async () => {
      toast.success(t("admin.company.saved"));
      await utils.admin.getCompanySettings.invalidate();
      await utils.platform.getBranding.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleLogoPick = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("admin.company.logoTypeError"));
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error(t("admin.company.logoSizeError"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveMut.mutate({
      companyNameAr: companyNameAr.trim() || null,
      companyNameEn: companyNameEn.trim() || null,
      logoUrl,
      address: address.trim() || null,
      phone: phone.trim() || null,
      email: email.trim() || null,
      taxNumber: taxNumber.trim() || null,
    });
  };

  if (settingsQuery.isLoading) {
    return <Skeleton className="h-96 rounded-xl" />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="font-display text-xl font-bold">{t("admin.company.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("admin.company.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.company.preview")}</CardTitle>
          <CardDescription>{t("admin.company.previewDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="rounded-lg border bg-muted/20 p-4">
          <CompanyDocumentHeader showContact />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.company.logoSection")}</CardTitle>
          <CardDescription>{t("admin.company.logoHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="relative flex h-24 w-40 items-center justify-center overflow-hidden rounded-xl border bg-muted/30"
            >
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain p-2" />
                  <button
                    type="button"
                    className="absolute top-1 end-1 rounded-full bg-background/90 p-1 shadow border"
                    onClick={() => setLogoUrl(null)}
                    aria-label={t("admin.company.removeLogo")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground px-2 text-center">
                  {t("admin.company.noLogo")}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoPick(e.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                <Camera className="h-4 w-4" />
                {logoUrl ? t("admin.company.changeLogo") : t("admin.company.uploadLogo")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("admin.company.logoFormats")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("admin.company.detailsSection")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company-ar">{t("admin.company.nameAr")}</Label>
            <Input id="company-ar" value={companyNameAr} onChange={(e) => setCompanyNameAr(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-en">{t("admin.company.nameEn")}</Label>
            <Input id="company-en" value={companyNameEn} onChange={(e) => setCompanyNameEn(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="company-address">{t("admin.company.address")}</Label>
            <Textarea id="company-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-phone">{t("admin.company.phone")}</Label>
            <Input id="company-phone" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-email">{t("admin.company.email")}</Label>
            <Input
              id="company-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="company-tax">{t("admin.company.taxNumber")}</Label>
            <Input id="company-tax" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} dir="ltr" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveMut.isPending}>
          {saveMut.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </div>
    </div>
  );
}
