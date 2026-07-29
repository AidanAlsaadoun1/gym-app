import { addWeeks } from "date-fns";
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  exercises as exercisesTable,
  sessions,
  setsLog,
  workoutTemplates,
  type MuscleGroup,
} from "@/lib/db/schema";
import { weekKey, weekStart } from "@/lib/stats/dates";

/**
 * All queries here are scoped to a single userId and to *finished* sessions
 * (`end_time IS NOT NULL`). In-progress sessions are intentionally excluded
 * — they'd inflate counters with partial data.
 *
 * Tonnage uses `weight_kg * reps_completed` and excludes warmup sets, which
 * is the standard hypertrophy-volume convention.
 */

export interface SessionRollup {
  id: string;
  startTime: Date;
  endTime: Date;
  templateId: string | null;
  templateName: string | null;
  durationSeconds: number;
  tonnage: number;
  workingSets: number;
  exerciseCount: number;
}

/** Finished sessions in [from, to) with rollup metrics. */
export async function sessionsInRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<SessionRollup[]> {
  const rows = await db
    .select({
      id: sessions.id,
      startTime: sessions.startTime,
      endTime: sessions.endTime,
      templateId: sessions.workoutTemplateId,
      templateName: workoutTemplates.name,
      tonnage: sql<string>`COALESCE(SUM(
        CASE WHEN ${setsLog.isWarmup} THEN 0
             ELSE ${setsLog.weightKg} * ${setsLog.repsCompleted}
        END
      ), 0)`.as("tonnage"),
      workingSets: sql<number>`COUNT(*) FILTER (WHERE NOT ${setsLog.isWarmup} AND ${setsLog.id} IS NOT NULL)::int`.as(
        "working_sets",
      ),
      // Warmup-only exercises don't count: they contribute nothing to tonnage
      // or working sets, so counting them made cards read "2 ex · 3 sets" for a
      // session where only one exercise actually did any work.
      exerciseCount: sql<number>`COUNT(DISTINCT CASE
        WHEN NOT ${setsLog.isWarmup} THEN ${setsLog.exerciseId}
      END)::int`.as("exercise_count"),
    })
    .from(sessions)
    .leftJoin(setsLog, eq(setsLog.sessionId, sessions.id))
    .leftJoin(workoutTemplates, eq(workoutTemplates.id, sessions.workoutTemplateId))
    .where(
      and(
        eq(sessions.userId, userId),
        isNotNull(sessions.endTime),
        gte(sessions.startTime, from),
        lt(sessions.startTime, to),
      ),
    )
    .groupBy(sessions.id, workoutTemplates.name)
    .orderBy(desc(sessions.startTime));

  return rows.map((r) => ({
    id: r.id,
    startTime: r.startTime,
    endTime: r.endTime!,
    templateId: r.templateId,
    templateName: r.templateName,
    durationSeconds: Math.max(
      0,
      Math.round((r.endTime!.getTime() - r.startTime.getTime()) / 1000),
    ),
    tonnage: Number(r.tonnage),
    workingSets: r.workingSets,
    exerciseCount: r.exerciseCount,
  }));
}

export interface MuscleVolume {
  muscleGroup: MuscleGroup;
  tonnage: number;
  workingSets: number;
}

/** Volume per primary muscle group across [from, to) for finished sessions. */
export async function volumeByMuscle(
  userId: string,
  from: Date,
  to: Date,
): Promise<MuscleVolume[]> {
  const rows = await db
    .select({
      muscleGroup: exercisesTable.primaryMuscleGroup,
      tonnage: sql<string>`COALESCE(SUM(${setsLog.weightKg} * ${setsLog.repsCompleted}), 0)`.as(
        "tonnage",
      ),
      workingSets: sql<number>`COUNT(*)::int`.as("working_sets"),
    })
    .from(setsLog)
    .innerJoin(sessions, eq(sessions.id, setsLog.sessionId))
    .innerJoin(exercisesTable, eq(exercisesTable.id, setsLog.exerciseId))
    .where(
      and(
        eq(sessions.userId, userId),
        isNotNull(sessions.endTime),
        eq(setsLog.isWarmup, false),
        gte(sessions.startTime, from),
        lt(sessions.startTime, to),
      ),
    )
    .groupBy(exercisesTable.primaryMuscleGroup);

  return rows.map((r) => ({
    muscleGroup: r.muscleGroup as MuscleGroup,
    tonnage: Number(r.tonnage),
    workingSets: r.workingSets,
  }));
}

export interface WeeklyTonnage {
  weekStart: Date;
  tonnage: number;
}

/**
 * Weekly tonnage from `fromInclusive` forward, one entry per week including
 * weeks with no training.
 *
 * Bucketing happens in JS rather than with `date_trunc('week', ...)`. The SQL
 * version truncated in the database's timezone (UTC on Neon) while every other
 * week boundary in the app comes from date-fns in local time, so for anyone not
 * on UTC a Monday-morning session landed in the previous week — the stats
 * page's "this week" tile and the last bar of this chart disagreed about the
 * same sets. One implementation, one boundary.
 *
 * Zero weeks used to be absent entirely, which made the trend line skip over
 * rest weeks and compress the x-axis instead of showing the dip.
 */
export async function weeklyTonnage(
  userId: string,
  fromInclusive: Date,
  weeks: number,
): Promise<WeeklyTonnage[]> {
  const rows = await db
    .select({
      startTime: sessions.startTime,
      tonnage: sql<string>`COALESCE(SUM(${setsLog.weightKg} * ${setsLog.repsCompleted}), 0)`.as(
        "tonnage",
      ),
    })
    .from(setsLog)
    .innerJoin(sessions, eq(sessions.id, setsLog.sessionId))
    .where(
      and(
        eq(sessions.userId, userId),
        isNotNull(sessions.endTime),
        eq(setsLog.isWarmup, false),
        gte(sessions.startTime, fromInclusive),
      ),
    )
    .groupBy(sessions.id)
    .orderBy(asc(sessions.startTime));

  const totals = new Map<string, number>();
  for (const row of rows) {
    const key = weekKey(row.startTime);
    totals.set(key, (totals.get(key) ?? 0) + Number(row.tonnage));
  }

  const series: WeeklyTonnage[] = [];
  let cursor = weekStart(fromInclusive);
  for (let i = 0; i < weeks; i++) {
    series.push({ weekStart: cursor, tonnage: totals.get(weekKey(cursor)) ?? 0 });
    cursor = addWeeks(cursor, 1);
  }
  return series;
}

export interface PeriodSummary {
  sessionCount: number;
  tonnage: number;
  workingSets: number;
  durationSeconds: number;
}

/** Headline totals for a date range — the home and history summary rows. */
export async function periodSummary(
  userId: string,
  from: Date,
  to: Date,
): Promise<PeriodSummary> {
  const rollups = await sessionsInRange(userId, from, to);
  return rollups.reduce<PeriodSummary>(
    (acc, s) => ({
      sessionCount: acc.sessionCount + 1,
      tonnage: acc.tonnage + s.tonnage,
      workingSets: acc.workingSets + s.workingSets,
      durationSeconds: acc.durationSeconds + s.durationSeconds,
    }),
    { sessionCount: 0, tonnage: 0, workingSets: 0, durationSeconds: 0 },
  );
}

export interface ExerciseBest {
  /** Heaviest working set ever logged for this exercise. */
  bestWeightKg: number;
  /** Best single-set volume (weight × reps) — the "best set" PR. */
  bestSetVolume: number;
}

/**
 * Personal bests per exercise across finished sessions, for the PR badges on
 * the live screen. Excludes warmups and the session passed as `excludeSessionId`
 * so an in-progress workout is compared against history rather than itself.
 */
export async function bestsByExercise(
  userId: string,
  exerciseIds: string[],
  excludeSessionId?: string,
): Promise<Record<string, ExerciseBest>> {
  if (exerciseIds.length === 0) return {};

  const rows = await db
    .select({
      exerciseId: setsLog.exerciseId,
      bestWeightKg: sql<string>`COALESCE(MAX(${setsLog.weightKg}), 0)`.as(
        "best_weight",
      ),
      bestSetVolume: sql<string>`COALESCE(MAX(${setsLog.weightKg} * ${setsLog.repsCompleted}), 0)`.as(
        "best_set_volume",
      ),
    })
    .from(setsLog)
    .innerJoin(sessions, eq(sessions.id, setsLog.sessionId))
    .where(
      and(
        eq(sessions.userId, userId),
        isNotNull(sessions.endTime),
        eq(setsLog.isWarmup, false),
        inArray(setsLog.exerciseId, exerciseIds),
        excludeSessionId ? ne(setsLog.sessionId, excludeSessionId) : undefined,
      ),
    )
    .groupBy(setsLog.exerciseId);

  const out: Record<string, ExerciseBest> = {};
  for (const row of rows) {
    out[row.exerciseId] = {
      bestWeightKg: Number(row.bestWeightKg),
      bestSetVolume: Number(row.bestSetVolume),
    };
  }
  return out;
}
