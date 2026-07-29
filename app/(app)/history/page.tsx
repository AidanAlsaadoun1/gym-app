import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { sessionsInRange, type SessionRollup } from "@/lib/stats/queries";
import {
  formatMonthHeading,
  formatMonthParam,
  isoDayKey,
  parseMonthParam,
  weekKey,
} from "@/lib/stats/dates";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionLabel } from "@/components/ui/label";
import { Stat } from "@/components/ui/stat";
import { HistoryCalendar, dayAnchorId } from "@/components/history-calendar";
import {
  formatDayLabel,
  formatDuration,
  formatHours,
  splitTonnage,
} from "@/lib/ui/format";

export const metadata = { title: "History" };

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
  const monthEndExclusive = startOfMonth(addMonths(monthStart, 1));
  const previousMonth = formatMonthParam(subMonths(monthStart, 1));
  const nextMonth = formatMonthParam(addMonths(monthStart, 1));
  const isCurrentMonth = monthStart >= startOfMonth(new Date());

  const monthSessions = await sessionsInRange(
    session.user.id,
    monthStart,
    monthEndExclusive,
  );

  const volumeByDay: Record<string, number> = {};
  for (const entry of monthSessions) {
    const key = isoDayKey(entry.startTime);
    volumeByDay[key] = (volumeByDay[key] ?? 0) + entry.tonnage;
  }

  const totalSeconds = monthSessions.reduce(
    (acc, s) => acc + s.durationSeconds,
    0,
  );
  const totalVolume = splitTonnage(
    monthSessions.reduce((acc, s) => acc + s.tonnage, 0),
  );

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between gap-2">
        <Link
          href={{ pathname: "/history", query: { month: previousMonth } }}
          aria-label="Previous month"
          className="tappable -ml-2 flex size-9 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-card hover:text-fg"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="truncate text-[20px] font-bold tracking-tight text-fg">
          {formatMonthHeading(monthStart)}
        </h1>
        {isCurrentMonth ? (
          // Nothing to see in the future — keep the arrow from leading nowhere.
          <span aria-hidden className="size-9 shrink-0" />
        ) : (
          <Link
            href={{ pathname: "/history", query: { month: nextMonth } }}
            aria-label="Next month"
            className="tappable -mr-2 flex size-9 shrink-0 items-center justify-center rounded-full text-fg-muted hover:bg-card hover:text-fg"
          >
            <ChevronRight className="size-5" />
          </Link>
        )}
      </header>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Workouts" value={String(monthSessions.length)} />
        <Stat label="Time" value={formatHours(totalSeconds)} />
        <Stat
          label="Volume"
          value={totalVolume.value}
          unit={totalVolume.unit}
          tone="accent"
        />
      </div>

      <HistoryCalendar monthStart={monthStart} volumeByDay={volumeByDay} />

      {monthSessions.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={`Nothing logged in ${format(monthStart, "MMMM")}`}
          description="Finished workouts show up here with their volume and duration."
        />
      ) : (
        <ul className="space-y-4">
          {groupByWeek(monthSessions).map(({ weekStart, sessions }) => (
            <li key={weekStart}>
              <SectionLabel>
                Week of {format(new Date(weekStart), "d MMM")}
              </SectionLabel>
              <ul className="mt-2 space-y-2">
                {sessions.map((entry, index) => {
                  // Anchor the first session of each day so the calendar can
                  // scroll straight to it.
                  const dayKey = isoDayKey(entry.startTime);
                  const previousDayKey =
                    index === 0
                      ? null
                      : isoDayKey(sessions[index - 1]!.startTime);
                  const anchor =
                    previousDayKey === dayKey ? undefined : dayAnchorId(dayKey);
                  const volume = splitTonnage(entry.tonnage);

                  return (
                    <li
                      key={entry.id}
                      id={anchor}
                      className="scroll-mt-24 rounded-card border border-border bg-card p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-bold text-fg">
                            {entry.templateName ?? "Workout"}
                          </p>
                          <p className="mt-0.5 text-[12px] text-fg-subtle">
                            {formatDayLabel(entry.startTime)} ·{" "}
                            {format(entry.startTime, "HH:mm")}
                          </p>
                        </div>
                        <p className="shrink-0 text-right text-[15px] font-bold tabular-nums text-fg">
                          {volume.value}
                          <span className="text-[11px] font-semibold text-fg-subtle">
                            {volume.unit}
                          </span>
                        </p>
                      </div>

                      <div className="mt-2.5 flex items-center gap-3 text-[12px] font-medium text-fg-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {formatDuration(entry.durationSeconds)}
                        </span>
                        <span>
                          {entry.exerciseCount}{" "}
                          {entry.exerciseCount === 1 ? "exercise" : "exercises"}
                        </span>
                        <span>
                          {entry.workingSets}{" "}
                          {entry.workingSets === 1 ? "set" : "sets"}
                        </span>
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

function groupByWeek(sessions: SessionRollup[]): {
  weekStart: string;
  sessions: SessionRollup[];
}[] {
  const map = new Map<string, SessionRollup[]>();
  for (const entry of sessions) {
    const key = weekKey(entry.startTime);
    const list = map.get(key);
    if (list) list.push(entry);
    else map.set(key, [entry]);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // newest week first
    .map(([weekStart, entries]) => ({ weekStart, sessions: entries }));
}
