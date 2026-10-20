import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH, bhdAdminEntryHref, bhdStartHref } from "@/const";
import {
  fetchIdentityAccounts,
  identityAddAccountHref,
  logoutIdentityAccount,
  NASAB_WORKSPACE_PATH,
  switchIdentityAccount,
  type IdentityAccount,
} from "@/lib/identity/accounts";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

function productSub(user: { bhdSub?: string | null; unionId?: string | null } | null | undefined) {
  if (!user) return null;
  if (user.bhdSub) return String(user.bhdSub);
  const unionId = user.unionId || "";
  if (unionId.startsWith("bhd:")) return unionId.slice(4);
  return null;
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [accounts, setAccounts] = useState<IdentityAccount[]>([]);
  const [identityUser, setIdentityUser] = useState<IdentityAccount | null>(null);

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    if (!user) {
      setAccounts([]);
      setIdentityUser(null);
      return;
    }
    let cancelled = false;
    void fetchIdentityAccounts().then((data) => {
      if (cancelled) return;
      setAccounts(data.accounts);
      setIdentityUser(data.user);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  const refreshAccounts = useCallback(async () => {
    const data = await fetchIdentityAccounts();
    setAccounts(data.accounts);
    setIdentityUser(data.user);
    return data;
  }, []);

  /** امسح جلسة نَسَب فقط ثم افتح مساحة العمل — الميدلوير/الحارس يحوّل إلى start إن لزم */
  const rebindProductSession = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync({ all: false });
    } catch {
      /* ignore — cookie may already be gone */
    }
    await utils.invalidate();
    window.location.assign(NASAB_WORKSPACE_PATH);
  }, [logoutMutation, utils]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync({ all: false });
    } catch {
      /* continue */
    }
    await utils.invalidate();
    const next = await logoutIdentityAccount(false);
    if (next.user) {
      setIdentityUser(next.user);
      setAccounts(next.accounts.length ? next.accounts : [next.user]);
      window.location.assign(NASAB_WORKSPACE_PATH);
      return;
    }
    setIdentityUser(null);
    setAccounts([]);
    navigate(redirectPath);
  }, [logoutMutation, navigate, redirectPath, utils]);

  const logoutAll = useCallback(async () => {
    const result = await logoutMutation.mutateAsync({ all: true });
    await utils.invalidate();
    await logoutIdentityAccount(true);
    setIdentityUser(null);
    setAccounts([]);
    if (result?.endSessionUrl) {
      window.location.href = result.endSessionUrl;
      return;
    }
    navigate(redirectPath);
  }, [logoutMutation, navigate, redirectPath, utils]);

  const switchAccount = useCallback(
    async (sub: string) => {
      const previous = identityUser;
      const optimistic = accounts.find((item) => item.id === sub);
      if (optimistic) setIdentityUser(optimistic);
      const data = await switchIdentityAccount(sub);
      if (!data?.user) {
        if (previous) setIdentityUser(previous);
        return;
      }
      setIdentityUser(data.user);
      setAccounts(data.accounts);
      const currentSub = productSub(user);
      if (currentSub && currentSub === data.user.id) return;
      await rebindProductSession();
    },
    [accounts, identityUser, rebindProductSession, user],
  );

  const addAccount = useCallback(() => {
    window.location.assign(identityAddAccountHref());
  }, []);

  useEffect(() => {
    if (redirectOnUnauthenticated && !isLoading && !user) {
      const currentPath = `${window.location.pathname}${window.location.search}`;
      if (redirectPath === LOGIN_PATH) {
        if (window.location.pathname.startsWith("/admin")) {
          window.location.replace(bhdAdminEntryHref(window.location.pathname));
          return;
        }
        const returnTo =
          currentPath.startsWith("/") && !currentPath.startsWith("//")
            ? currentPath
            : NASAB_WORKSPACE_PATH;
        window.location.replace(bhdStartHref(returnTo));
        return;
      }
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, isLoading, user, navigate, redirectPath]);

  return useMemo(
    () => ({
      user: user ?? null,
      identityUser,
      accounts,
      isAuthenticated: !!user,
      isLoading: isLoading || logoutMutation.isPending,
      error,
      logout,
      logoutAll,
      switchAccount,
      addAccount,
      refresh: refetch,
      refreshAccounts,
    }),
    [
      user,
      identityUser,
      accounts,
      isLoading,
      logoutMutation.isPending,
      error,
      logout,
      logoutAll,
      switchAccount,
      addAccount,
      refetch,
      refreshAccounts,
    ],
  );
}
