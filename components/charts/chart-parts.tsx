"use client";

import type { TooltipProps } from "recharts";

/**
 * Shared chart furniture.
 *
 * Mark and axis colours are NOT set here — they live in the `.chart` block in
 * globals.css. See the comment there: recharts writes its own colours as SVG
 * presentation attributes, which beat anything we pass by prop or className.
 */

/** Compact kg axis labels: 800, 4.2t, 25t. */
export function formatAxisKg(value: number): string {
  if (value >= 10_000) return `${Math.round(value / 1000)}t`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}t`;
  return String(Math.round(value));
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit = "kg",
  secondary,
}: TooltipProps<number, string> & {
  unit?: string;
  /** Extra line under the value, e.g. "12 sets". */
  secondary?: (entry: Record<string, unknown>) => string | null;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;

  const extra = secondary?.(entry.payload as Record<string, unknown>) ?? null;

  return (
    <div className="rounded-xl border border-border bg-bg-elevated px-2.5 py-2 shadow-raised">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">
        {label}
      </p>
      <p className="mt-0.5 text-[15px] font-bold tabular-nums text-fg">
        {Math.round(Number(entry.value ?? 0)).toLocaleString()}
        <span className="ml-0.5 text-[11px] font-semibold text-fg-subtle">
          {unit}
        </span>
      </p>
      {extra ? (
        <p className="text-[11px] font-medium text-fg-muted">{extra}</p>
      ) : null}
    </div>
  );
}
