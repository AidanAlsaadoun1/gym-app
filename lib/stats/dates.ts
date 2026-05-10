import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  parse,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from "date-fns";

const WEEK_OPTS = { weekStartsOn: 1 } as const; // Monday

/** "2026-04" → Date for the first day of that month, in local time. */
export function parseMonthParam(input: string | null | undefined): Date {
  if (!input) return startOfMonth(new Date());
  const parsed = parse(input, "yyyy-MM", new Date());
  if (Number.isNaN(parsed.getTime())) return startOfMonth(new Date());
  return startOfMonth(parsed);
}

export function formatMonthParam(date: Date): string {
  return format(date, "yyyy-MM");
}

export function formatMonthHeading(date: Date): string {
  return format(date, "MMMM yyyy");
}

/** Inclusive bounds for displaying a month grid: full weeks containing month. */
export function monthGridBounds(monthStart: Date) {
  const start = startOfWeek(monthStart, WEEK_OPTS);
  const end = endOfWeek(endOfMonth(monthStart), WEEK_OPTS);
  return { start, end };
}

/** Build the 6×7 (or 5×7) grid of dates that the calendar renders. */
export function monthGridDays(monthStart: Date): Date[] {
  const { start, end } = monthGridBounds(monthStart);
  const days: Date[] = [];
  let cursor = start;
  while (cursor <= end) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function weekStart(date: Date): Date {
  return startOfWeek(date, WEEK_OPTS);
}

export function weekKey(date: Date): string {
  return format(startOfWeek(date, WEEK_OPTS), "yyyy-MM-dd");
}

export function nWeeksAgoStart(n: number, from: Date = new Date()): Date {
  return startOfWeek(subWeeks(from, n - 1), WEEK_OPTS);
}

export function isoDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export const WEEK_OPTIONS = WEEK_OPTS;
