import { format, isThisYear, isToday, isYesterday } from "date-fns";

/**
 * Shared display formatting. These used to be copy-pasted per page, which is
 * why the same tonnage could render as "1.2t" on history and "1200 kg" on
 * stats.
 */

/** Total volume. Switches to tonnes past 1000 kg so the number stays scannable. */
export function formatTonnage(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return "0 kg";
  if (kg >= 10_000) return `${Math.round(kg / 1000)}t`;
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)} kg`;
}

/** Splits tonnage into value + unit for the number-first stat tiles. */
export function splitTonnage(kg: number): { value: string; unit: string } {
  if (!Number.isFinite(kg) || kg <= 0) return { value: "0", unit: "kg" };
  if (kg >= 10_000) return { value: String(Math.round(kg / 1000)), unit: "t" };
  if (kg >= 1000) return { value: (kg / 1000).toFixed(1), unit: "t" };
  return { value: String(Math.round(kg)), unit: "kg" };
}

/** A logged weight — no trailing ".0", but keeps 82.5. */
export function formatWeight(kg: number): string {
  if (!Number.isFinite(kg)) return "0";
  return Number.isInteger(kg) ? String(kg) : String(Number(kg.toFixed(2)));
}

/** Coarse duration for lists and summaries: "48m", "1h 12m". */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.round((safe % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Ticking clock for the live session header: "12:04", "1:02:33". */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = secs.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Rest countdown: "1:30", "0:09". */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/** Hours with one decimal below 10h: "6.5h", "12h". */
export function formatHours(seconds: number): string {
  const hours = Math.max(0, seconds) / 3600;
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
}

/** "Today", "Yesterday", "Mon 3 Mar", or "3 Mar 2024" outside this year. */
export function formatDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return isThisYear(date) ? format(date, "EEE d MMM") : format(date, "d MMM yyyy");
}
