import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";

/** خطوط نسب بأسلوب MyHeritage: رمادي فاتح رفيع، بلا أسهم */
export const LINE_BG = "bg-stone-400/90 print:bg-stone-600";
export const LINE_H = "h-px";
export const LINE_W = "w-px";

/** خط عمودي متصل بلا فجوات */
export function VLine({
  className,
  h = 28,
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

/**
 * رابط زوجية: خط أفقي رفيع فقط (بدون قلب/أسهم) — التواريخ اختيارية تحته.
 */
export function CoupleLink({
  marriageLabel,
  divorceLabel,
  className,
  minWidth = 40,
  onClick,
  editTitle,
}: {
  marriageLabel?: string | null;
  divorceLabel?: string | null;
  className?: string;
  minWidth?: number;
  onClick?: () => void;
  editTitle?: string;
}) {
  const interactive = !!onClick;
  const Comp = interactive ? "button" : "div";
  return (
    <Comp
      type={interactive ? "button" : undefined}
      data-no-pan={interactive ? true : undefined}
      title={interactive ? editTitle : undefined}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      onPointerDown={
        interactive
          ? (e) => {
              e.stopPropagation();
            }
          : undefined
      }
      className={cn(
        "relative flex flex-col items-center justify-center shrink-0 self-center",
        interactive &&
          "cursor-pointer rounded-md px-0.5 hover:bg-amber-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
        className,
      )}
      style={{ minWidth }}
    >
      <div className="relative flex h-4 w-full items-center">
        <div
          className={cn(
            "absolute inset-x-0 top-1/2 -translate-y-1/2",
            LINE_H,
            LINE_BG,
            interactive && "bg-amber-500/70",
          )}
        />
      </div>
      {(marriageLabel || divorceLabel || interactive) && (
        <div className="mt-0.5 flex flex-col items-center gap-px max-w-[5.5rem]">
          {marriageLabel ? (
            <span className="text-[7px] text-stone-500 text-center leading-tight truncate px-0.5">
              {marriageLabel}
            </span>
          ) : interactive ? (
            <span className="text-[7px] text-amber-700/90 text-center leading-tight px-0.5">
              +
            </span>
          ) : null}
          {divorceLabel && (
            <span className="text-[7px] text-stone-400 text-center leading-tight truncate px-0.5">
              {divorceLabel}
            </span>
          )}
        </div>
      )}
    </Comp>
  );
}

/** @deprecated توافق — نفس CoupleLink */
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
    <CoupleLink
      marriageLabel={marriageLabel}
      divorceLabel={divorceLabel}
      className={className}
      minWidth={32}
    />
  );
}

/**
 * تفرّع الأبناء: جذع رأسي + شريط أفقي متعامد + فروع رأسية.
 * مسافات أوسع بين الأعمدة لقراءة أوضح.
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
        <VLine h={28} />
        {items}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center w-max max-w-none", className)}>
      <VLine h={18} />
      <div className="relative flex flex-nowrap items-start justify-center" dir="rtl">
        {items.map((child, i) => {
          const isFirst = i === 0;
          const isLast = i === count - 1;
          return (
            <div
              key={child.key ?? i}
              className="relative flex flex-col items-center"
            >
              <div className="relative h-6 w-full min-w-[3rem]">
                <div
                  className={cn("absolute top-0", LINE_H, LINE_BG)}
                  style={{
                    right: isFirst ? "50%" : 0,
                    left: isLast ? "50%" : 0,
                  }}
                />
                <div
                  className={cn(
                    "absolute left-1/2 top-0 h-6 -translate-x-1/2",
                    LINE_W,
                    LINE_BG,
                  )}
                />
              </div>
              <div className="px-3 sm:px-5">{child}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

/** @deprecated */
export function CoupleBridge({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center shrink-0 self-center", className)}>
      <div className={cn("w-6 sm:w-10", LINE_H, LINE_BG)} />
    </div>
  );
}

export function CoupleToChildrenConnector({
  className,
  h = 10,
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
        <VLine h={28} />
        {children}
      </div>
    );
  }

  return <BranchRow className={className}>{children}</BranchRow>;
}
