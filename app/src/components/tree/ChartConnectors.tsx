import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import { Heart } from "lucide-react";

/** لون وسمك موحّد لكل خطوط النسب */
export const LINE_BG = "bg-slate-600 print:bg-slate-800";
export const LINE_H = "h-[2px]";
export const LINE_W = "w-[2px]";

/** خط عمودي متصل بلا فجوات */
export function VLine({
  className,
  h = 24,
}: {
  className?: string;
  h?: number;
}) {
  return (
    <div
      className={cn(LINE_W, "shrink-0", LINE_BG, className)}
      style={{ height: h }}
    />
  );
}

/** أيقونة زواج — تُرسم فوق الخط الأفقي دون قطعه */
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
        "relative z-10 flex flex-col items-center gap-0.5",
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
 * رابط زوجية متصل: خط أفقي واحد من حافة لحاقة مع القلب في الوسط.
 */
export function CoupleLink({
  marriageLabel,
  divorceLabel,
  className,
  minWidth = 56,
}: {
  marriageLabel?: string | null;
  divorceLabel?: string | null;
  className?: string;
  minWidth?: number;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center shrink-0 self-center",
        className,
      )}
      style={{ minWidth }}
    >
      <div className="relative flex h-6 w-full items-center">
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2",
            LINE_H,
            LINE_BG,
          )}
        />
        <span className="relative z-10 mx-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 border border-pink-200 shadow-sm print:shadow-none">
          <Heart className="h-3 w-3 fill-pink-500" />
        </span>
      </div>
      {(marriageLabel || divorceLabel) && (
        <div className="mt-0.5 flex flex-col items-center gap-px max-w-[5.5rem]">
          {marriageLabel && (
            <span className="text-[7px] text-pink-700 text-center leading-tight truncate px-0.5">
              {marriageLabel}
            </span>
          )}
          {divorceLabel && (
            <span className="text-[7px] text-stone-500 text-center leading-tight truncate px-0.5">
              {divorceLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * تفرّع الأبناء: جذع رأسي واحد + شريط أفقي متصل + فروع رأسية.
 * الحشو الأفقي تحت منطقة الخطوط فقط حتى لا تنقطع الوصلة بين الأعمدة.
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
        <VLine h={22} />
        {items}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center w-max max-w-none", className)}>
      {/* جذع من الأبوين إلى منتصف الشريط */}
      <VLine h={14} />
      <div className="relative flex flex-nowrap items-start justify-center" dir="rtl">
        {items.map((child, i) => {
          const isFirst = i === 0;
          const isLast = i === count - 1;
          return (
            <div
              key={child.key ?? i}
              className="relative flex flex-col items-center"
            >
              {/* منطقة الموصلات — عرض كامل العمود بلا padding حتى تلتقي الخطوط */}
              <div className="relative h-5 w-full min-w-[2.5rem]">
                <div
                  className={cn("absolute top-0", LINE_H, LINE_BG)}
                  style={{
                    // في RTL: الأول يميناً → نقطع يساره عند المنتصف
                    right: isFirst ? "50%" : 0,
                    left: isLast ? "50%" : 0,
                  }}
                />
                <div
                  className={cn(
                    "absolute left-1/2 top-0 h-5 -translate-x-1/2",
                    LINE_W,
                    LINE_BG,
                  )}
                />
              </div>
              {/* الحشو حول المحتوى فقط */}
              <div className="px-2 sm:px-3">{child}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** عمود تحت التفرّع */
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

/** توافق قديم */
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

/** @deprecated استخدم CoupleLink */
export function CoupleBridge({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center shrink-0 self-center", className)}>
      <div className={cn("w-5 sm:w-8", LINE_H, LINE_BG)} />
    </div>
  );
}

/** خط من صف الزوجين للأبناء — يُدمج مع SiblingFork؛ اتركه للجذع الإضافي إن لزم */
export function CoupleToChildrenConnector({
  className,
  h = 8,
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

/** شريط إخوة — جذع + تفرّع متصل */
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
        <VLine h={22} />
        {children}
      </div>
    );
  }

  return <BranchRow className={className}>{children}</BranchRow>;
}
