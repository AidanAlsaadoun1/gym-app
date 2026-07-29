import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold",
  {
    variants: {
      tone: {
        neutral: "bg-inset text-fg-muted",
        accent: "bg-accent-soft text-accent",
        success: "bg-success-soft text-success",
        danger: "bg-danger-soft text-danger",
        warning: "bg-warning-soft text-warning",
        info: "bg-info-soft text-info",
        solid: "bg-fg text-bg",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] uppercase tracking-[0.06em]",
        md: "px-2.5 py-1 text-[11px] uppercase tracking-[0.06em]",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
  );
}

/** Horizontally scrollable filter pill. */
export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "tappable shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium capitalize",
        active
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-card text-fg-muted hover:border-border-strong hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export { badgeVariants };
