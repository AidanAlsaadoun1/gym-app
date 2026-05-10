import { and, asc, desc, eq, gte, isNotNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  exercises as exercisesTable,
  sessions,
  setsLog,
  workoutTemplates,
  type MuscleGroup,
} from "@/lib/db/schema";

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
      exerciseCount: sql<number>`COUNT(DISTINCT ${setsLog.exerciseId})::int`.as(
        "exercise_count",
      ),
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

/** Weekly tonnage for the last `weeks` weeks. Weeks start on Monday. */
export async function weeklyTonnage(
  userId: string,
  fromInclusive: Date,
): Promise<WeeklyTonnage[]> {
  const rows = await db
    .select({
      weekStart: sql<Date>`date_trunc('week', ${sessions.startTime})`.as("week_start"),
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
    .groupBy(sql`date_trunc('week', ${sessions.startTime})`)
    .orderBy(asc(sql`date_trunc('week', ${sessions.startTime})`));

  return rows.map((r) => ({
    weekStart: new Date(r.weekStart as unknown as string),
    tonnage: Number(r.tonnage),
  }));
}
