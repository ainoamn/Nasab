import { useEffect } from "react";
import { hopOrigins } from "@/lib/bhd/apps";

function preconnect(origin: string) {
  if (!origin || document.head.querySelector(`link[data-bhd-hop="${origin}"]`)) return;
  const pre = document.createElement("link");
  pre.rel = "preconnect";
  pre.href = origin;
  pre.setAttribute("data-bhd-hop", origin);
  document.head.appendChild(pre);
}

/** تسخين صفحات نَسَب + preconnect لمنشأ التطبيقات — BHD-ACCOUNT-SWITCHER §5 */
export function NavigationWarmup() {
  useEffect(() => {
    const warm = () => {
      hopOrigins().forEach(preconnect);
      void import("@/pages/Home");
      void import("@/pages/Dashboard");
      void import("@/pages/AccountSettings");
      void import("@/pages/Checkout");
      void import("@/pages/TreeWorkspace");
      void import("@/pages/Setup");
    };
    const onFirst = () => {
      warm();
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
    window.addEventListener("pointerdown", onFirst, { once: true });
    window.addEventListener("keydown", onFirst, { once: true });
    const timer = window.setTimeout(warm, 800);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, []);

  return null;
}
