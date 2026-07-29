"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  /** Round committed values to whole numbers (reps). */
  integer?: boolean;
  /** Shown greyed out when the field is empty — e.g. the previous session's reps. */
  placeholder?: string;
}

/**
 * Numeric field that keeps the raw keystrokes in local state and only reports
 * parsed numbers upward.
 *
 * The previous implementation fed `Number(e.target.value)` straight back into a
 * controlled `value`, so a partial decimal was unreachable: typing "82.5" got
 * as far as "82." which `Number()` collapsed to 82, re-rendering the field as
 * "82" and eating the dot. Every kg entry was effectively locked to integers.
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      value,
      onChange,
      min = 0,
      max = 9999,
      integer = false,
      className,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) => {
    const [draft, setDraft] = React.useState<string | null>(null);
    const display = draft ?? (value === null ? "" : String(value));

    const commit = (raw: string) => {
      if (raw.trim() === "") {
        onChange(null);
        return;
      }
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return;
      const clamped = Math.min(max, Math.max(min, parsed));
      onChange(integer ? Math.round(clamped) : clamped);
    };

    return (
      <input
        ref={ref}
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        // A pattern-free text input avoids Safari's number-spinner quirks while
        // still bringing up the numeric keypad on iOS.
        autoComplete="off"
        value={display}
        onChange={(event) => {
          const raw = event.target.value;
          // Digits, one optional decimal point. Anything else is ignored
          // outright rather than silently mangled.
          if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
          setDraft(raw);
          commit(raw);
        }}
        onFocus={(event) => {
          event.target.select();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          // Drop the draft so the field re-syncs with the clamped/rounded value.
          setDraft(null);
          onBlur?.(event);
        }}
        className={cn(
          "w-full rounded-lg border border-transparent bg-inset text-center font-bold tabular-nums text-fg transition-colors",
          "placeholder:font-medium placeholder:text-fg-subtle",
          "focus:border-accent focus:bg-card focus:outline-none",
          className,
        )}
        {...props}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";

/** Labelled −/+ stepper around a NumberInput. */
export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  integer = false,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  suffix?: string;
}) {
  const nudge = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    // Two decimals is enough for 1.25 kg plates and stops 82.500000001 leaking
    // into the input.
    onChange(integer ? Math.round(next) : Math.round(next * 100) / 100);
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </span>
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => nudge(-step)}
          disabled={value <= min}
          className="tappable flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-fg-muted hover:text-fg disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <div className="relative flex-1">
          <NumberInput
            value={value}
            onChange={(next) => onChange(next ?? min)}
            min={min}
            max={max}
            integer={integer}
            className="h-11 border-border text-[17px]"
          />
          {suffix ? (
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-fg-subtle">
              {suffix}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => nudge(step)}
          disabled={value >= max}
          className="tappable flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-fg-muted hover:text-fg disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
