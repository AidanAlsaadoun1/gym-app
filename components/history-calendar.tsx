import { endOfMonth, format, isSameMonth, isToday } from "date-fns";

import { isoDayKey, monthGridDays } from "@/lib/stats/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Day-key prefix for hash anchors. The history list tags the first session of
 * each day with the matching id, so tapping a day scrolls to it (smooth scroll
 * comes from globals.css).
 */
export function dayAnchorId(date: Date | string): string {
  const key = typeof date === "string" ? date : isoDayKey(date);
  return `day-${key}`;
}

/** Volume tiers → dot opacity, so a heavy week reads darker than a light one. */
function intensityFor(volume: number, max: number): number {
  if (volume <= 0 || max <= 0) return 0;
  const ratio = volume / max;
  if (ratio > 0.66) return 3;
  if (ratio > 0.33) return 2;
  return 1;
}

const INTENSITY_CLASSES = [
  "",
  "bg-accent/35 text-fg",
  "bg-accent/65 text-accent-fg",
  "bg-accent text-accent-fg",
] as const;

export function HistoryCalendar({
  monthStart,
  volumeByDay,
}: {
  monthStart: Date;
  /** "yyyy-MM-dd" → total tonnage logged that day. */
  volumeByDay: Record<string, number>;
}) {
  const days = monthGridDays(monthStart);
  const monthEnd = endOfMonth(monthStart);
  const maxVolume = Math.max(0, ...Object.values(volumeByDay));

  return (
    <div className="rounded-card border border-border bg-card p-3">
      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            className="text-[10px] font-bold uppercase tracking-[0.06em] text-fg-subtle"
          >
            {day}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, monthStart) && day <= monthEnd;
          const key = isoDayKey(day);
          const volume = inMonth ? (volumeByDay[key] ?? 0) : 0;
          const intensity = intensityFor(volume, maxVolume);
          const today = isToday(day);

          const cellClass = cn(
            "flex aspect-square items-center justify-center rounded-lg text-[13px] font-semibold tabular-nums transition-colors",
            inMonth ? "text-fg-muted" : "text-fg-subtle/40",
            intensity > 0
              ? INTENSITY_CLASSES[intensity]
              : today
                ? "bg-inset"
                : undefined,
            today && "ring-1 ring-accent",
          );

          const label = format(day, "d");

          if (intensity > 0) {
            return (
              <a
                key={key}
                href={`#${dayAnchorId(key)}`}
                className={cn(cellClass, "tappable")}
                aria-label={`Sessions on ${format(day, "EEEE d MMMM")}`}
              >
                {label}
              </a>
            );
          }

          return (
            <div key={key} className={cellClass} aria-hidden={!inMonth}>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}
