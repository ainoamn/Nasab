import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH, bhdAdminEntryHref, bhdStartHref } from "@/const";
import {
  fetchIdentityAccounts,
  identityAddAccountHref,
  logoutIdentityAccount,
  nasabSilentStartHref,
  switchIdentityAccount,
  type IdentityAccount,
} from "@/lib/identity/accounts";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [accounts, setAccounts] = useState<IdentityAccount[]>([]);

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
      return;
    }
    let cancelled = false;
    void fetchIdentityAccounts().then((data) => {
      if (cancelled) return;
      setAccounts(data.accounts);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  const refreshAccounts = useCallback(async () => {
    const data = await fetchIdentityAccounts();
    setAccounts(data.accounts);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync({ all: false });
    await utils.invalidate();
    const remaining = await logoutIdentityAccount(false);
    if (remaining) {
      window.location.assign(nasabSilentStartHref(window.location.pathname));
      return;
    }
    navigate(redirectPath);
  }, [logoutMutation, navigate, redirectPath, utils]);

  const logoutAll = useCallback(async () => {
    const result = await logoutMutation.mutateAsync({ all: true });
    await utils.invalidate();
    await logoutIdentityAccount(true);
    if (result?.endSessionUrl) {
      window.location.href = result.endSessionUrl;
      return;
    }
    navigate(redirectPath);
  }, [logoutMutation, navigate, redirectPath, utils]);

  const switchAccount = useCallback(async (sub: string) => {
    const ok = await switchIdentityAccount(sub);
    if (!ok) return;
    const returnTo = `${window.location.pathname}${window.location.search}`;
    window.location.assign(nasabSilentStartHref(returnTo));
  }, []);

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
        window.location.replace(bhdStartHref(currentPath));
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
