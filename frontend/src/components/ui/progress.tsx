"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ProgressProps = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & {
  value?: number | null;
  indicatorClassName?: string;
};

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, indicatorClassName, ...props }, ref) => {
    const safeValue = clamp(Number(value ?? 0), 0, 100);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full bg-slate-900 transition-all dark:bg-slate-50",
            indicatorClassName
          )}
          style={{ width: `${safeValue}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
