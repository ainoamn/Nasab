import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import { Heart } from "lucide-react";

const LINE = "bg-slate-500 print:bg-slate-700";

/** خط عمودي متصل */
export function VLine({
  className,
  h = 28,
}: {
  className?: string;
  h?: number;
}) {
  return (
    <div
      className={cn("w-0.5 shrink-0", LINE, className)}
      style={{ height: h }}
    />
  );
}

/** أيقونة زواج فوق خط متصل */
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
    <div
      className={cn(
        "relative z-10 flex flex-col items-center gap-0.5 py-0.5",
        className,
      )}
    >
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
 * صف أبناء/فروع — خط رأسي من الأعلى يتصل بشريط أفقي متصل ثم فروع للأبناء.
 */
export function BranchRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
  busDrop?: number;
}) {
  const items = Children.toArray(children).filter(isValidElement);
  const count = items.length;
  if (count === 0) return null;

  if (count === 1) {
    return (
      <div className={cn("flex flex-col items-center w-max", className)}>
        <VLine h={20} />
        {items}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center w-max max-w-none", className)}>
      <VLine h={16} />
      <div className="flex flex-nowrap items-start justify-center" dir="rtl">
        {items.map((child, i) => (
          <div
            key={child.key ?? i}
            className="relative flex flex-col items-center w-max px-2 sm:px-3"
          >
            <div className="relative h-5 w-full shrink-0">
              <div
                className={cn("absolute top-0 h-0.5", LINE)}
                style={{
                  left: i === count - 1 ? "50%" : 0,
                  right: i === 0 ? "50%" : 0,
                }}
              />
              <div
                className={cn(
                  "absolute left-1/2 top-0 h-5 w-0.5 -translate-x-1/2",
                  LINE,
                )}
              />
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

/** قطعة خط أفقي متصل بين الزوج والزوجة (بدون فجوة) */
export function CoupleBridge({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center shrink-0 self-start mt-[1.875rem]",
        className,
      )}
    >
      <div className={cn("w-4 sm:w-7 h-0.5", LINE)} />
    </div>
  );
}

/** خط متصل من صف الزوجين إلى الأبناء */
export function CoupleToChildrenConnector({
  className,
  h = 28,
}: {
  className?: string;
  h?: number;
}) {
  return (
    <div className={cn("flex flex-col items-center -mb-px", className)}>
      <VLine h={h} />
    </div>
  );
}

/** شريط إخوة متصل */
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
      <div className={cn("flex flex-col items-center w-max -mt-px", className)}>
        <VLine h={20} />
        {children}
      </div>
    );
  }

  return <BranchRow className={cn("-mt-px", className)}>{children}</BranchRow>;
}
