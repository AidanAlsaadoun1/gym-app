import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  exercises as exercisesTable,
  sessions,
  setsLog,
  templateExercises,
  workoutTemplates,
  type SessionPlanEntry,
} from "@/lib/db/schema";
import { num } from "@/lib/api/serialize";
import { bestsByExercise } from "@/lib/stats/queries";
import { LiveSession } from "@/components/session/live-session";
import type {
  ExerciseRow,
  LastSets,
  LoggedSet,
} from "@/lib/session/types";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const { id } = await params;

  const [s] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, session.user.id)))
    .limit(1);

  if (!s) notFound();
  // Already finished — there's nothing to log, so send them where the workout
  // now lives instead of dropping them on the home screen.
  if (s.endTime) redirect("/history");

  // Resolve the exercise list for this session.
  //
  //  - If the session has a `plan` (generator output, or explicit snapshot),
  //    build the list from the plan + a join against the exercise library.
  //  - Otherwise, if there's a workoutTemplateId, fall back to the
  //    template's current `template_exercises`.
  //  - Otherwise it's an ad-hoc session (out of scope; see live-session.tsx).
  let exercises: ExerciseRow[] = [];
  let templateName: string | null = null;
  let templateEstimatedMinutes: number | null = null;
  const plan: SessionPlanEntry[] | null = s.plan ?? null;
  const hasPlan = Array.isArray(plan) && plan.length > 0;

  if (s.workoutTemplateId) {
    const [tpl] = await db
      .select({
        id: workoutTemplates.id,
        name: workoutTemplates.name,
        estimatedMinutes: workoutTemplates.estimatedMinutes,
      })
      .from(workoutTemplates)
      .where(
        and(
          eq(workoutTemplates.id, s.workoutTemplateId),
          eq(workoutTemplates.userId, session.user.id),
          isNull(workoutTemplates.deletedAt),
        ),
      )
      .limit(1);
    templateName = tpl?.name ?? null;
    templateEstimatedMinutes = tpl?.estimatedMinutes ?? null;
  }

  if (hasPlan) {
    const planEntries = plan!;
    const ids = planEntries.map((p) => p.exerciseId);
    const metaRows = await db
      .select({
        id: exercisesTable.id,
        name: exercisesTable.name,
        primaryMuscleGroup: exercisesTable.primaryMuscleGroup,
        equipment: exercisesTable.equipment,
        imageUrl: exercisesTable.imageUrl,
        videoUrl: exercisesTable.videoUrl,
      })
      .from(exercisesTable)
      .where(inArray(exercisesTable.id, ids));
    const metaById = new Map(metaRows.map((m) => [m.id, m]));

    exercises = [...planEntries]
      .sort((a, b) => a.exerciseOrder - b.exerciseOrder)
      .map((entry) => {
        const meta = metaById.get(entry.exerciseId);
        return {
          exerciseId: entry.exerciseId,
          name: meta?.name ?? "(unknown)",
          primaryMuscleGroup: meta?.primaryMuscleGroup ?? "other",
          equipment: meta?.equipment ?? "other",
          defaultSets: entry.defaultSets,
          defaultReps: entry.defaultReps,
          supersetGroup: entry.supersetGroup,
          imageUrl: meta?.imageUrl ?? null,
          videoUrl: meta?.videoUrl ?? null,
        };
      });
  } else if (s.workoutTemplateId) {
    const rows = await db
      .select({
        exerciseId: templateExercises.exerciseId,
        defaultSets: templateExercises.defaultSets,
        defaultReps: templateExercises.defaultReps,
        supersetGroup: templateExercises.supersetGroup,
        name: exercisesTable.name,
        primaryMuscleGroup: exercisesTable.primaryMuscleGroup,
        equipment: exercisesTable.equipment,
        imageUrl: exercisesTable.imageUrl,
        videoUrl: exercisesTable.videoUrl,
      })
      .from(templateExercises)
      .innerJoin(exercisesTable, eq(templateExercises.exerciseId, exercisesTable.id))
      .where(eq(templateExercises.workoutTemplateId, s.workoutTemplateId))
      .orderBy(asc(templateExercises.exerciseOrder));

    exercises = rows.map((r) => ({
      exerciseId: r.exerciseId,
      name: r.name,
      primaryMuscleGroup: r.primaryMuscleGroup,
      equipment: r.equipment,
      defaultSets: r.defaultSets,
      defaultReps: r.defaultReps,
      supersetGroup: r.supersetGroup,
      imageUrl: r.imageUrl,
      videoUrl: r.videoUrl,
    }));
  }

  // Sets logged so far in this session (for resume).
  const setsRaw = await db
    .select()
    .from(setsLog)
    .where(eq(setsLog.sessionId, s.id))
    .orderBy(asc(setsLog.completedAt));

  const loggedSets: LoggedSet[] = setsRaw.map((row) => ({
    id: row.id,
    exerciseId: row.exerciseId,
    setNumber: row.setNumber,
    weightKg: num(row.weightKg) ?? 0,
    repsCompleted: row.repsCompleted,
    isWarmup: row.isWarmup,
  }));

  /**
   * Last-session sets per exercise — for the "Last: 80kg × 5,5,4" hint.
   * One query gets every set the user has ever logged for these exercises in
   * a *finished* session, ordered by most recent. We then bucket per
   * exercise, keeping only the rows that belong to the latest session-id
   * we see for that exercise.
   */
  const exerciseIds = exercises.map((e) => e.exerciseId);
  const lastSetsByExercise: Record<string, LastSets> = {};

  // Historical bests power the PR badges. This session is excluded so the
  // workout is measured against past ones, never against itself.
  const bests = await bestsByExercise(session.user.id, exerciseIds, s.id);

  if (exerciseIds.length > 0) {
    const historyRows = await db
      .select({
        exerciseId: setsLog.exerciseId,
        sessionId: setsLog.sessionId,
        setNumber: setsLog.setNumber,
        weightKg: setsLog.weightKg,
        repsCompleted: setsLog.repsCompleted,
        isWarmup: setsLog.isWarmup,
        sessionStartTime: sessions.startTime,
      })
      .from(setsLog)
      .innerJoin(sessions, eq(sessions.id, setsLog.sessionId))
      .where(
        and(
          eq(sessions.userId, session.user.id),
          isNotNull(sessions.endTime),
          inArray(setsLog.exerciseId, exerciseIds),
        ),
      )
      .orderBy(desc(sessions.startTime), asc(setsLog.setNumber));

    // First session-id we encounter per exerciseId is the most recent one.
    const seenSessionPerExercise: Record<string, string> = {};
    for (const row of historyRows) {
      if (!seenSessionPerExercise[row.exerciseId]) {
        seenSessionPerExercise[row.exerciseId] = row.sessionId;
        lastSetsByExercise[row.exerciseId] = [];
      }
      if (seenSessionPerExercise[row.exerciseId] !== row.sessionId) continue;
      lastSetsByExercise[row.exerciseId]!.push({
        setNumber: row.setNumber,
        weightKg: num(row.weightKg) ?? 0,
        repsCompleted: row.repsCompleted,
        isWarmup: row.isWarmup,
      });
    }
  }

  return (
    <LiveSession
      sessionId={s.id}
      startTime={s.startTime.toISOString()}
      templateName={templateName}
      targetMinutes={templateEstimatedMinutes}
      exercises={exercises}
      initialSets={loggedSets}
      lastSetsByExercise={lastSetsByExercise}
      bests={bests}
    />
  );
}
