import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  addMonths,
  endOfMonth,
  format,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { sessionsInRange, type SessionRollup } from "@/lib/stats/queries";
import {
  formatMonthHeading,
  formatMonthParam,
  isoDayKey,
  parseMonthParam,
  weekKey,
} from "@/lib/stats/dates";
import { HistoryCalendar, dayAnchorId } from "@/components/history-calendar";

interface SearchParams {
  month?: string;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const params = await searchParams;
  const monthStart = parseMonthParam(params?.month);
  const monthEnd = endOfMonth(monthStart);
  const monthEndExclusive = startOfMonth(addMonths(monthStart, 1));
  const prev = formatMonthParam(subMonths(monthStart, 1));
  const next = formatMonthParam(addMonths(monthStart, 1));

  const monthSessions = await sessionsInRange(
    session.user.id,
    monthStart,
    monthEndExclusive,
  );

  const sessionDays = new Set(monthSessions.map((s) => isoDayKey(s.startTime)));
  const totalSeconds = monthSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalTonnage = monthSessions.reduce((acc, s) => acc + s.tonnage, 0);

  // Group by week for the list view, week starting Monday.
  const grouped = groupByWeek(monthSessions);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <Link
          href={{ pathname: "/history", query: { month: prev } }}
          aria-label="Previous month"
          className="-ml-2 inline-flex size-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">
          {formatMonthHeading(monthStart)}
        </h1>
        <Link
          href={{ pathname: "/history", query: { month: next } }}
          aria-label="Next month"
          className="-mr-2 inline-flex size-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100"
        >
          <ChevronRight className="size-5" />
        </Link>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Sessions" value={String(monthSessions.length)} tone="indigo" />
        <Stat label="Hours" value={formatHours(totalSeconds)} tone="emerald" />
        <Stat label="Tonnage" value={formatTonnage(totalTonnage)} tone="amber" />
      </div>

      <HistoryCalendar monthStart={monthStart} sessionDays={sessionDays} />

      {monthSessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          No sessions in {formatMonthHeading(monthStart)}.
        </div>
      ) : (
        <ul className="space-y-4">
          {grouped.map(({ weekStart, sessions }) => (
            <li key={weekStart} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Week of {format(new Date(weekStart), "EEE d MMM")}
              </h2>
              <ul className="space-y-2">
                {sessions.map((s, sessionIdx) => {
                  // Tag the first session of each day with a hash anchor so
                  // the calendar can scroll-to it.
                  const dayKey = isoDayKey(s.startTime);
                  const prevDay =
                    sessionIdx === 0
                      ? null
                      : isoDayKey(sessions[sessionIdx - 1]!.startTime);
                  const anchor = prevDay === dayKey ? undefined : dayAnchorId(dayKey);
                  return (
                    <li
                      key={s.id}
                      id={anchor}
                      className="scroll-mt-20 rounded-2xl border border-neutral-200 bg-white p-3"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {s.templateName ?? "Session"}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {format(s.startTime, "EEE d MMM, HH:mm")} ·{" "}
                            {s.exerciseCount} ex · {s.workingSets} sets
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-neutral-500">
                          <p className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatDuration(s.durationSeconds)}
                          </p>
                          <p className="font-medium text-neutral-700">
                            {formatTonnage(s.tonnage)}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const STAT_TONES = {
  indigo: { wrap: "border-indigo-200 bg-indigo-50", value: "text-indigo-700" },
  emerald: { wrap: "border-emerald-200 bg-emerald-50", value: "text-emerald-700" },
  amber: { wrap: "border-amber-200 bg-amber-50", value: "text-amber-800" },
  neutral: { wrap: "border-neutral-200 bg-white", value: "text-neutral-900" },
} as const;

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: keyof typeof STAT_TONES;
}) {
  const t = STAT_TONES[tone];
  return (
    <div className={`rounded-xl border p-3 text-center ${t.wrap}`}>
      <p className="text-xs uppercase tracking-wide text-neutral-600">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${t.value}`}>
        {value}
      </p>
    </div>
  );
}

function groupByWeek(sessions: SessionRollup[]): {
  weekStart: string;
  sessions: SessionRollup[];
}[] {
  const map = new Map<string, SessionRollup[]>();
  for (const s of sessions) {
    const k = weekKey(s.startTime);
    const list = map.get(k) ?? [];
    list.push(s);
    map.set(k, list);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // newest first
    .map(([weekStart, sessions]) => ({ weekStart, sessions }));
}

function formatHours(seconds: number): string {
  const h = seconds / 3600;
  if (h >= 10) return `${h.toFixed(0)}h`;
  return `${h.toFixed(1)}h`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTonnage(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
  return `${Math.round(kg)} kg`;
}
