"use client";

import * as React from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface MenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  href?: string;
  external?: boolean;
  tone?: "default" | "danger";
  disabled?: boolean;
}

/**
 * Small overflow menu. Closes on outside pointer-down, Escape, and selection.
 */
export function Menu({
  items,
  label = "More options",
  align = "right",
  className,
}: {
  items: MenuItem[];
  label?: string;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className="tappable flex size-8 items-center justify-center rounded-lg text-fg-subtle hover:bg-inset hover:text-fg"
      >
        <MoreHorizontal className="size-5" />
      </button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-9 z-30 min-w-44 animate-pop overflow-hidden rounded-xl border border-border bg-bg-elevated p-1 shadow-raised",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            const content = (
              <>
                {item.icon ? <item.icon className="size-4 shrink-0" /> : null}
                <span className="truncate">{item.label}</span>
              </>
            );
            const classes = cn(
              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] font-medium",
              item.tone === "danger"
                ? "text-danger hover:bg-danger-soft"
                : "text-fg hover:bg-inset",
              item.disabled && "pointer-events-none opacity-40",
            );

            if (item.href) {
              return (
                <a
                  key={item.label}
                  role="menuitem"
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer noopener" : undefined}
                  onClick={() => setOpen(false)}
                  className={classes}
                >
                  {content}
                </a>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={classes}
              >
                {content}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
