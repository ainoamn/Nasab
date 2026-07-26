import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import { Heart } from "lucide-react";

/** خط عمودي */
export function VLine({
  className,
  h = 28,
}: {
  className?: string;
  h?: number;
}) {
  return (
    <div
      className={cn("w-px shrink-0 bg-slate-400 print:bg-slate-600", className)}
      style={{ height: h }}
    />
  );
}

/** أيقونة زواج + تواريخ */
export function SpouseHeart({
  marriageLabel,
  divorceLabel,
  className,
}: {
  marriageLabel?: string | null;
  divorceLabel?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 py-0.5", className)}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 border border-pink-200 shadow-sm print:shadow-none">
        <Heart className="h-3 w-3 fill-pink-500" />
      </span>
      {marriageLabel && (
        <span className="text-[7px] text-pink-700 text-center leading-tight max-w-[5.5rem] truncate px-0.5">
          {marriageLabel}
        </span>
      )}
      {divorceLabel && (
        <span className="text-[7px] text-stone-500 text-center leading-tight max-w-[5.5rem] truncate px-0.5">
          {divorceLabel}
        </span>
      )}
    </div>
  );
}

/**
 * صف أبناء/فروع بعرض طبيعي لكل عمود (ليس 1fr متساوٍ) —
 * حتى لا تنفصل الزوجات عن الأزواج بسبب تمدد الأعمدة الفارغة.
 */
export function BranchRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  /** مهمل — أُبقي للتوافق */
  busDrop?: number;
}) {
  const items = Children.toArray(children).filter(isValidElement);
  const count = items.length;
  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className={cn("flex flex-col items-center w-max", className)}>
        <VLine h={14} />
        {items}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center w-max max-w-none", className)}>
      <VLine h={10} />
      <div className="flex flex-nowrap items-start justify-center" dir="rtl">
        {items.map((child, i) => (
          <div
            key={child.key ?? i}
            className="relative flex flex-col items-center w-max px-2 sm:px-3"
          >
            <div className="relative h-4 w-full shrink-0">
              {/* خط أفقي يمر عبر العمود ويتصل بالجوار */}
              <div
                className="absolute top-0 h-px bg-slate-400 print:bg-slate-600"
                style={{
                  left: i === count - 1 ? "50%" : 0,
                  right: i === 0 ? "50%" : 0,
                }}
              />
              <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-slate-400 print:bg-slate-600" />
            </div>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

/** عمود تحت التفرّع — عرض المحتوى لا التمدد */
export function BranchColumn({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center w-max shrink-0", className)}>
      {children}
    </div>
  );
}

/** تخطيط الأب + زوجات — RTL: الأولى يميناً */
export function PolygamyLayout({
  wifeCount: _wifeCount,
  children,
  className,
}: {
  wifeCount: number;
  children: ReactNode;
  className?: string;
}) {
  return <BranchRow className={className}>{children}</BranchRow>;
}

/** خط أفقي بين الزوجين */
export function CoupleBridge({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center shrink-0 self-start mt-7", className)}>
      <div className="w-3 sm:w-5 h-px bg-slate-400 print:bg-slate-600" />
    </div>
  );
}

/** خط من الزوجين للأبناء */
export function CoupleToChildrenConnector({
  className,
  h = 24,
}: {
  className?: string;
  h?: number;
}) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      <VLine h={h} />
    </div>
  );
}

/** شريط إخوة */
export function SiblingFork({
  childCount,
  children,
  className,
}: {
  childCount: number;
  children: ReactNode;
  className?: string;
}) {
  if (childCount <= 1) {
    return (
      <div className={cn("flex flex-col items-center w-max", className)}>
        <VLine h={18} />
        {children}
      </div>
    );
  }

  return <BranchRow className={className}>{children}</BranchRow>;
}
