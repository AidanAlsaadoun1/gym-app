"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type SheetVariant = "bottom" | "full";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  /** Rendered on the right of the header, left of the close button. */
  headerAction?: React.ReactNode;
  /** Pinned to the bottom, outside the scroll area. */
  footer?: React.ReactNode;
  variant?: SheetVariant;
  children: React.ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * One modal implementation for every overlay in the app: exercise picker,
 * generator, bug report, workout summary.
 *
 * Handles the things each ad-hoc overlay used to get wrong — Escape to close,
 * a focus trap, focus restored to whatever opened it, and a body scroll lock
 * that survives nested sheets.
 */
export function Sheet({
  open,
  onClose,
  title,
  headerAction,
  footer,
  variant = "bottom",
  children,
  className,
}: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    // Move focus into the panel so the trap and screen readers start inside it.
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const autoFocus = panel.querySelector<HTMLElement>("[data-autofocus]");
      (autoFocus ?? panel).focus();
    }, 30);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      body.style.overflow = previousOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex animate-fade-in justify-center",
        variant === "bottom" ? "items-end sm:items-center" : "items-stretch",
      )}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex w-full animate-slide-up flex-col overflow-hidden bg-bg-elevated shadow-sheet outline-none",
          variant === "bottom"
            ? "max-h-[92dvh] max-w-md rounded-t-sheet sm:max-h-[86dvh] sm:rounded-sheet"
            : "h-dvh max-w-xl",
          className,
        )}
      >
        <header
          className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3"
          style={
            variant === "full"
              ? { paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }
              : undefined
          }
        >
          <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold text-fg">
            {title}
          </h2>
          {headerAction}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tappable -mr-1 inline-flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-card hover:text-fg"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {footer ? (
          <div
            className="shrink-0 border-t border-border bg-bg-elevated p-4"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)",
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
