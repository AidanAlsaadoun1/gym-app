import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The number-first tile used across home, history and the workout summary.
 * Value is loud, label is quiet — never the other way round.
 */
export function Stat({
  label,
  value,
  unit,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
  tone?: "default" | "accent" | "success";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card px-3 py-2.5",
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 text-fg-subtle" /> : null}
        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-1 text-[22px] font-bold leading-none tabular-nums",
          tone === "accent" && "text-accent",
          tone === "success" && "text-success",
          tone === "default" && "text-fg",
        )}
      >
        {value}
        {unit ? (
          <span className="ml-0.5 text-[13px] font-semibold text-fg-subtle">
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  );
}
