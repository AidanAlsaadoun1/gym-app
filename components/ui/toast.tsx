"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

/**
 * App-wide toasts. Replaces the `alert()` calls that used to report failures —
 * a native alert blocks the whole UI thread and looks nothing like the app.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        // Above every sheet and the nav; pointer-events only on the toasts
        // themselves so the layer never blocks taps.
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-3 pt-safe"
        role="region"
        aria-label="Notifications"
      >
        <div className="flex w-full max-w-sm flex-col gap-2 pt-3">
          {toasts.map((t) => (
            <ToastRow key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

const TONE_STYLES: Record<
  ToastTone,
  { wrap: string; icon: React.ComponentType<{ className?: string }> }
> = {
  success: { wrap: "border-success/40 text-success", icon: CheckCircle2 },
  error: { wrap: "border-danger/40 text-danger", icon: AlertTriangle },
  info: { wrap: "border-border text-fg", icon: Info },
};

function ToastRow({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const { wrap, icon: Icon } = TONE_STYLES[toast.tone];
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex animate-slide-up items-start gap-2.5 rounded-xl border bg-bg-elevated px-3.5 py-3 shadow-raised",
        wrap,
      )}
    >
      <Icon className="mt-px size-4 shrink-0" />
      <p className="flex-1 text-[13px] font-medium text-fg">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-my-1 -mr-1 rounded-lg p-1 text-fg-subtle hover:text-fg"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx.toast;
}
