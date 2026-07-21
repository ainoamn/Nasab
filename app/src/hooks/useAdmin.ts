import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./useAuth";

type UseAdminOptions = {
  redirectOnForbidden?: boolean;
};

export function useAdmin(options?: UseAdminOptions) {
  const { redirectOnForbidden = true } = options ?? {};
  const auth = useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();

  const isAdmin = auth.user?.role === "admin";

  useEffect(() => {
    if (
      redirectOnForbidden &&
      !auth.isLoading &&
      auth.isAuthenticated &&
      !isAdmin
    ) {
      navigate("/dashboard");
    }
  }, [
    redirectOnForbidden,
    auth.isLoading,
    auth.isAuthenticated,
    isAdmin,
    navigate,
  ]);

  return useMemo(
    () => ({
      ...auth,
      isAdmin,
    }),
    [auth, isAdmin],
  );
}
