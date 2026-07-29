import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-border bg-inset px-3.5 py-2 text-fg transition-colors",
      "placeholder:text-fg-subtle",
      "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/35",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-invalid:border-danger aria-invalid:focus:ring-danger/35",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex w-full rounded-xl border border-border bg-inset px-3.5 py-2.5 text-fg transition-colors",
      "placeholder:text-fg-subtle",
      "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/35",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-11 w-full appearance-none rounded-xl border border-border bg-inset px-3.5 text-fg transition-colors",
      "focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/35",
      className,
    )}
    {...props}
  />
));
Select.displayName = "Select";
