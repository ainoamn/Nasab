import { useEffect } from "react";

/** تسخين صفحات نَسَب نفسها — الدليل المرجعي 0.3 */
export function NavigationWarmup() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import("@/pages/Dashboard");
      void import("@/pages/AccountSettings");
      void import("@/pages/Login");
      void import("@/pages/Checkout");
      void import("@/pages/TreeWorkspace");
    }, 200);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
