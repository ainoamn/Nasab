import { trpc } from "@/providers/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH, bhdAdminEntryHref, bhdStartHref } from "@/const";
import { addAccountUrl, applyAccountIsolation, switchWindowAccount } from "@/lib/identity/client";
import {
  fetchIdentityAccounts,
  logoutIdentityAccount,
  NASAB_WORKSPACE_PATH,
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

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync({ all: false });
    } catch {
      /* continue */
    }
    await utils.invalidate();
    const next = await logoutIdentityAccount(false);
    if (next.user) {
      /* حساب آخر بقي نشطاً على الهوية — اربط جلسة نَسَب به */
      applyAccountIsolation();
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

  const switchAccount = useCallback(async (sub: string) => {
    const switched = await switchWindowAccount(sub);
    if (!switched.ok) return;
    await applyAccountIsolation(switched.token);
  }, []);

  const addAccount = useCallback(() => {
    window.location.assign(addAccountUrl());
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
