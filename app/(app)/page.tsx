import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { addDays, addWeeks, format, subWeeks } from "date-fns";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { ArrowRight, Dumbbell, Plus, Timer } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  sessions,
  templateExercises,
  workoutTemplates,
} from "@/lib/db/schema";
import { sessionsInRange } from "@/lib/stats/queries";
import { isoDayKey, weekStart } from "@/lib/stats/dates";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionLabel } from "@/components/ui/label";
import { Stat } from "@/components/ui/stat";
import { RoutineCard } from "@/components/routine-card";
import { SignOutButton } from "@/components/sign-out-button";
import { BugReportButton } from "@/components/bug-report-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { formatDayLabel, formatDuration, splitTonnage } from "@/lib/ui/format";

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const now = new Date();
  const thisWeekStart = weekStart(now);

  const [inProgress, routines, recentSessions] = await Promise.all([
    db
      .select({
        id: sessions.id,
        startTime: sessions.startTime,
        templateName: workoutTemplates.name,
      })
      .from(sessions)
      .leftJoin(
        workoutTemplates,
        eq(sessions.workoutTemplateId, workoutTemplates.id),
      )
      .where(
        and(eq(sessions.userId, session.user.id), isNull(sessions.endTime)),
      )
      .orderBy(desc(sessions.startTime))
      .limit(1),
    db
      .select({
        id: workoutTemplates.id,
        name: workoutTemplates.name,
        splitType: workoutTemplates.splitType,
        estimatedMinutes: workoutTemplates.estimatedMinutes,
        exerciseCount: sql<number>`(
          SELECT COUNT(*)::int FROM ${templateExercises}
          WHERE ${templateExercises.workoutTemplateId} = ${workoutTemplates.id}
        )`.as("exercise_count"),
      })
      .from(workoutTemplates)
      .where(
        and(
          eq(workoutTemplates.userId, session.user.id),
          isNull(workoutTemplates.deletedAt),
        ),
      )
      .orderBy(desc(workoutTemplates.updatedAt))
      .limit(3),
    // One window covers the week tiles, the day strip and the recent list.
    sessionsInRange(session.user.id, subWeeks(thisWeekStart, 7), addWeeks(thisWeekStart, 1)),
  ]);

  const active = inProgress[0];
  const thisWeek = recentSessions.filter((s) => s.startTime >= thisWeekStart);
  const trainedDays = new Set(thisWeek.map((s) => isoDayKey(s.startTime)));
  const weekVolume = splitTonnage(
    thisWeek.reduce((acc, s) => acc + s.tonnage, 0),
  );
  const weekSets = thisWeek.reduce((acc, s) => acc + s.workingSets, 0);
  const todayKey = isoDayKey(now);

  const firstName = session.user.name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[13px] font-medium text-fg-subtle">
          {format(now, "EEEE d MMMM")}
        </p>
        <h1 className="mt-0.5 text-[28px] font-bold tracking-tight text-fg">
          {firstName ? `Hey, ${firstName}` : "Ready to train"}
        </h1>
      </header>

      {active ? (
        <Link
          href={`/session/${active.id}`}
          className="tappable block rounded-card border border-accent/50 bg-accent-soft p-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
              <Timer className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
                Workout in progress
              </p>
              <p className="truncate text-[15px] font-bold text-fg">
                {active.templateName ?? "Ad-hoc workout"}
              </p>
              <p className="text-[12px] text-fg-muted">
                Started {format(active.startTime, "HH:mm")}
              </p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-accent" />
          </div>
        </Link>
      ) : null}

      <section>
        <SectionLabel>This week</SectionLabel>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="Workouts" value={String(thisWeek.length)} />
          <Stat
            label="Volume"
            value={weekVolume.value}
            unit={weekVolume.unit}
            tone="accent"
          />
          <Stat label="Sets" value={String(weekSets)} />
        </div>

        <Card padding="sm" className="mt-2">
          <ul className="flex items-center justify-between">
            {Array.from({ length: 7 }, (_, index) => {
              const day = addDays(thisWeekStart, index);
              const key = isoDayKey(day);
              const trained = trainedDays.has(key);
              const isToday = key === todayKey;
              const isFuture = day > now;
              return (
                <li
                  key={key}
                  className="flex flex-1 flex-col items-center gap-1.5"
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      isToday ? "text-accent" : "text-fg-subtle",
                    )}
                  >
                    {WEEKDAY_INITIALS[index]}
                  </span>
                  <span
                    aria-label={`${format(day, "EEEE")}: ${trained ? "trained" : "rest"}`}
                    className={cn(
                      "size-7 rounded-full border-2",
                      trained
                        ? "border-accent bg-accent"
                        : isFuture
                          ? "border-dashed border-border"
                          : "border-border bg-inset",
                      isToday && !trained && "border-accent/60",
                    )}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2">
          <SectionLabel>Quick start</SectionLabel>
          <Link
            href="/templates"
            className="text-[12px] font-semibold text-accent"
          >
            All routines
          </Link>
        </div>

        {routines.length === 0 ? (
          <div className="mt-2">
            <EmptyState
              icon={Dumbbell}
              title="No routines yet"
              description="Build a routine — push, pull, legs, whatever you run — and it'll be one tap from here."
              action={
                <Link
                  href="/templates/new"
                  className={cn(buttonVariants({ size: "md" }))}
                >
                  <Plus className="size-4" />
                  Create a routine
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {routines.map((routine) => (
              <li key={routine.id}>
                <RoutineCard routine={routine} compact />
              </li>
            ))}
          </ul>
        )}
      </section>

      {recentSessions.length > 0 ? (
        <section>
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Recent workouts</SectionLabel>
            <Link
              href="/history"
              className="text-[12px] font-semibold text-accent"
            >
              History
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-border rounded-card border border-border bg-card">
            {recentSessions.slice(0, 3).map((entry) => {
              const volume = splitTonnage(entry.tonnage);
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-fg">
                      {entry.templateName ?? "Workout"}
                    </p>
                    <p className="text-[12px] text-fg-subtle">
                      {formatDayLabel(entry.startTime)} ·{" "}
                      {formatDuration(entry.durationSeconds)}
                    </p>
                  </div>
                  <p className="shrink-0 text-[13px] font-bold tabular-nums text-fg-muted">
                    {volume.value}
                    <span className="text-[11px] text-fg-subtle">
                      {volume.unit}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section>
        <SectionLabel>Settings</SectionLabel>
        <Card className="mt-2 space-y-4">
          <div>
            <p className="text-[13px] font-semibold text-fg">Appearance</p>
            <p className="mb-2.5 text-[12px] text-fg-muted">
              Dark is built for the gym floor.
            </p>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3.5">
            <BugReportButton />
            <SignOutButton />
          </div>
        </Card>
      </section>
    </div>
  );
}
