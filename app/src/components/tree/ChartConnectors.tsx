import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Children, isValidElement } from "react";
import { Heart } from "lucide-react";

const LINE = "#64748b";

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

/** صف أفقي بخطوط متصلة — أعمدة متساوية العرض لمحاذاة دقيقة */
export function BranchRow({
  children,
  className,
  busDrop = 14,
}: {
  children: ReactNode;
  className?: string;
  busDrop?: number;
}) {
  const count = Children.toArray(children).filter(isValidElement).length;
  if (count === 0) return null;

  const busTop = 0;
  const forkY = busDrop;

  return (
    <div className={cn("relative w-full", className)} style={{ paddingTop: forkY }}>
      <svg
        className="absolute inset-x-0 top-0 w-full overflow-visible pointer-events-none print:overflow-visible"
        style={{ height: forkY }}
        aria-hidden
      >
        <line
          x1="50%"
          y1={busTop}
          x2="50%"
          y2={Math.min(6, forkY - 4)}
          stroke={LINE}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {count > 1 ? (
          <>
            <line
              x1={`${100 / (2 * count)}%`}
              y1={Math.min(6, forkY - 4)}
              x2={`${100 - 100 / (2 * count)}%`}
              y2={Math.min(6, forkY - 4)}
              stroke={LINE}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            {Array.from({ length: count }, (_, i) => {
              const x = ((i + 0.5) / count) * 100;
              return (
                <line
                  key={i}
                  x1={`${x}%`}
                  y1={Math.min(6, forkY - 4)}
                  x2={`${x}%`}
                  y2={forkY}
                  stroke={LINE}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </>
        ) : (
          <line
            x1="50%"
            y1={Math.min(6, forkY - 4)}
            x2="50%"
            y2={forkY}
            stroke={LINE}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      <div
        className="grid w-full gap-x-4 sm:gap-x-8"
        style={{ gridTemplateColumns: `repeat(${count}, minmax(7rem, 1fr))` }}
        dir="rtl"
      >
        {children}
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
    <div className={cn("flex flex-col items-center min-w-0 w-full", className)}>
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
  return (
    <BranchRow className={className} busDrop={16}>
      {children}
    </BranchRow>
  );
}

/** خط أفقي بين الزوجين */
export function CoupleBridge({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center shrink-0 self-center", className)}>
      <div className="w-5 sm:w-7 h-px bg-slate-400 print:bg-slate-600" />
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

/** شريط إخوة — يستخدم نفس BranchRow للمحاذاة */
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
      <div className={cn("flex flex-col items-center w-full", className)}>
        <VLine h={18} />
        {children}
      </div>
    );
  }

  return (
    <BranchRow className={className} busDrop={18}>
      {children}
    </BranchRow>
  );
}
