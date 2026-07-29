import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * `buttonVariants` is exported so links can *look* like buttons without a
 * <button> nested inside an <a> (invalid HTML, and it swallows taps on iOS).
 * Reach for it on next/link elements instead of wrapping a <Button>.
 */
const buttonVariants = cva(
  "tappable inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg shadow-card hover:bg-accent-hover active:bg-accent",
        secondary:
          "border border-border bg-card text-fg hover:border-border-strong hover:bg-card-hover",
        ghost: "text-fg-muted hover:bg-card hover:text-fg",
        soft: "bg-accent-soft text-accent hover:brightness-110",
        danger: "bg-danger text-white shadow-card hover:brightness-110",
        success: "bg-success text-white shadow-card hover:brightness-110",
      },
      size: {
        sm: "h-9 px-3 text-[13px]",
        md: "h-11 px-4 text-[15px]",
        lg: "h-13 px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
