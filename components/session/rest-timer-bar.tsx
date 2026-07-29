"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

import { ProgressRing } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCountdown } from "@/lib/ui/format";

const ADJUST_SECONDS = 30;

/**
 * Rest countdown, pinned above the finish bar while a timer is running.
 *
 * `endAt` is an absolute epoch timestamp rather than a decrementing counter, so
 * the countdown stays truthful when the tab is backgrounded and the interval
 * stops firing — which on a phone in a pocket is the normal case.
 */
export function RestTimerBar({
  endAt,
  totalSeconds,
  onAdjust,
  onSkip,
  onExpire,
}: {
  endAt: number;
  totalSeconds: number;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
  onExpire: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const firedFor = useRef<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endAt]);

  const remainingMs = endAt - now;
  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const expired = remainingMs <= 0;

  // Fire once per timer instance, even though the tick re-renders constantly.
  useEffect(() => {
    if (!expired || firedFor.current === endAt) return;
    firedFor.current = endAt;
    onExpire();
  }, [expired, endAt, onExpire]);

  const fraction = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;

  return (
    <div
      role="timer"
      aria-live="off"
      className={cn(
        "animate-slide-up border-t bg-bg-elevated/95 backdrop-blur",
        expired ? "border-success/40" : "border-border",
      )}
    >
      <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 py-2.5">
        <ProgressRing
          value={fraction}
          tone={expired ? "success" : "accent"}
          size={40}
        >
          <Timer
            className={cn("size-4", expired ? "text-success" : "text-accent")}
          />
        </ProgressRing>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "font-mono text-[22px] font-bold leading-none tabular-nums",
              expired ? "text-success" : "text-fg",
            )}
          >
            {formatCountdown(remainingSeconds)}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
            {expired ? "Rest over — go" : "Resting"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <AdjustButton
            onClick={() => onAdjust(-ADJUST_SECONDS)}
            disabled={remainingSeconds <= ADJUST_SECONDS}
          >
            −{ADJUST_SECONDS}
          </AdjustButton>
          <AdjustButton onClick={() => onAdjust(ADJUST_SECONDS)}>
            +{ADJUST_SECONDS}
          </AdjustButton>
          <button
            type="button"
            onClick={onSkip}
            className={cn(
              "tappable h-9 rounded-xl px-3.5 text-[13px] font-bold",
              expired
                ? "bg-success text-white"
                : "border border-border bg-card text-fg",
            )}
          >
            {expired ? "Done" : "Skip"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdjustButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tappable h-9 rounded-xl border border-border bg-card px-2.5 text-[12px] font-bold tabular-nums text-fg-muted hover:text-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}
