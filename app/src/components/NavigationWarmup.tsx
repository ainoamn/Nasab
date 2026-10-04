import { useEffect } from "react";

/** تسخين صفحات نَسَب نفسها — الدليل المرجعي 0.3 */
export function NavigationWarmup() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void import("@/pages/Home");
      void import("@/pages/Dashboard");
      void import("@/pages/AccountSettings");
      void import("@/pages/Checkout");
      void import("@/pages/TreeWorkspace");
      void import("@/pages/Setup");
    }, 200);
    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
