import { useNavigate, useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { useTranslation } from "react-i18next";
import { useLabels } from "@/lib/labels";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import type { TreeRole } from "@contracts/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TreePalm, MailOpen, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();
  const L = useLabels();

  const infoQuery = trpc.member.inviteInfo.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false },
  );

  const acceptMut = trpc.member.acceptInvite.useMutation({
    onSuccess: (res) => {
      toast.success(t("invite.joined"));
      navigate(`/trees/${res.treeId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex justify-start p-4">
        <LanguageSwitcher variant="outline" />
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <TreePalm className="h-8 w-8" />
            </span>

            {infoQuery.isLoading || authLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48 mx-auto" />
                <Skeleton className="h-4 w-64 mx-auto" />
              </div>
            ) : infoQuery.error ? (
              <>
                <ShieldAlert className="mx-auto h-10 w-10 text-destructive/60 mb-3" />
                <h1 className="font-display text-xl font-bold">{t("invite.invalidTitle")}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{t("invite.invalidBody")}</p>
                <Button className="mt-6" variant="outline" onClick={() => navigate("/")}>
                  {t("invite.home")}
                </Button>
              </>
            ) : (
              <>
                <MailOpen className="mx-auto h-10 w-10 text-primary mb-3" />
                <h1 className="font-display text-2xl font-bold">{t("invite.title")}</h1>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {t("invite.body", {
                    tree: `${infoQuery.data!.treeName}${infoQuery.data!.tribe ? ` (${infoQuery.data!.tribe})` : ""}`,
                    role: L.roles[infoQuery.data!.role as TreeRole],
                  })}
                </p>
                {isAuthenticated ? (
                  <Button
                    className="mt-6 w-full"
                    size="lg"
                    disabled={acceptMut.isPending}
                    onClick={() => acceptMut.mutate({ token: token! })}
                  >
                    {acceptMut.isPending ? t("invite.joining") : t("invite.accept")}
                  </Button>
                ) : (
                  <div className="mt-6 space-y-3">
                    <p className="text-sm text-muted-foreground">{t("invite.loginFirst")}</p>
                    <Button className="w-full" size="lg" onClick={() => navigate("/login")}>
                      {t("invite.login")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
