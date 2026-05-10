import {
  endOfMonth,
  format,
  isSameMonth,
  isToday,
} from "date-fns";

import { isoDayKey, monthGridDays } from "@/lib/stats/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/**
 * Calendar day-key prefix used for hash anchors. The history page renders
 * the matching id on the first session of each day so clicking a day cell
 * smoothly scrolls to it (CSS scroll-behavior: smooth in globals.css).
 */
export function dayAnchorId(date: Date | string): string {
  const key = typeof date === "string" ? date : isoDayKey(date);
  return `day-${key}`;
}

export function HistoryCalendar({
  monthStart,
  sessionDays,
}: {
  monthStart: Date;
  /** Set of "yyyy-MM-dd" keys for days that contain at least one session. */
  sessionDays: Set<string>;
}) {
  const days = monthGridDays(monthStart);
  const monthEnd = endOfMonth(monthStart);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, monthStart) && day <= monthEnd;
          const key = isoDayKey(day);
          const hasSession = inMonth && sessionDays.has(key);
          const today = isToday(day);

          const cellClass = cn(
            "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm tabular-nums transition-colors",
            inMonth ? "text-neutral-800" : "text-neutral-300",
            today && "bg-neutral-100 font-semibold",
            hasSession && "bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
          );

          const content = (
            <>
              <span>{format(day, "d")}</span>
              {hasSession ? (
                <span
                  aria-hidden
                  className="absolute bottom-1 size-1.5 rounded-full bg-emerald-500"
                />
              ) : null}
            </>
          );

          if (hasSession) {
            return (
              <a
                key={key}
                href={`#${dayAnchorId(key)}`}
                className={cellClass}
                aria-label={`Go to sessions on ${format(day, "EEEE d MMMM")}`}
              >
                {content}
              </a>
            );
          }

          return (
            <div key={key} className={cellClass} aria-hidden={!inMonth}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
