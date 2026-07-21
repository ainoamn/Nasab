import type { PaymentGatewaySlug } from "@contracts/constants";
import { cn } from "@/lib/utils";

const BRAND: Record<
  PaymentGatewaySlug,
  { bg: string; label: string; abbr: string }
> = {
  thawani: { bg: "bg-violet-600", label: "Thawani", abbr: "T" },
  stripe: { bg: "bg-indigo-600", label: "Stripe", abbr: "S" },
  paypal: { bg: "bg-blue-700", label: "PayPal", abbr: "P" },
  bank_transfer: { bg: "bg-emerald-700", label: "Bank", abbr: "B" },
  manual: { bg: "bg-slate-600", label: "Manual", abbr: "M" },
};

type Props = {
  slug: string;
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

export default function GatewayLogo({ slug, name, className, size = "md" }: Props) {
  const brand = BRAND[slug as PaymentGatewaySlug] ?? {
    bg: "bg-primary",
    label: name ?? slug,
    abbr: slug.charAt(0).toUpperCase(),
  };

  const dim =
    size === "lg"
      ? "h-20 w-20 text-2xl"
      : size === "sm"
        ? "h-10 w-10 text-sm"
        : "h-14 w-14 text-lg";

  return (
    <div
      className={cn(
        "rounded-2xl flex items-center justify-center text-white font-bold shadow-md",
        brand.bg,
        dim,
        className,
      )}
      title={brand.label}
    >
      {slug === "stripe" ? (
        <span className="font-display italic text-sm">stripe</span>
      ) : slug === "paypal" ? (
        <span className="font-display italic">PayPal</span>
      ) : slug === "thawani" ? (
        <span className="text-2xl">ث</span>
      ) : slug === "bank_transfer" ? (
        <span className="text-lg">🏦</span>
      ) : (
        brand.abbr
      )}
    </div>
  );
}
