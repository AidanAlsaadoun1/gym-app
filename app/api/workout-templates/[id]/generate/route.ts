import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  exercises as exercisesTable,
  templateExercises,
  workoutTemplates,
} from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { generateWorkoutSchema } from "@/lib/api/schemas";
import { generateWorkout } from "@/lib/session/generator";

export const runtime = "nodejs";

/**
 * POST /api/workout-templates/:id/generate
 * Body: { targetMinutes: number }
 *
 * Returns a preview of the generated plan — the client decides whether to
 * actually start a session with it (POST /api/sessions { plan }).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const { targetMinutes } = generateWorkoutSchema.parse(body);

    const [template] = await db
      .select()
      .from(workoutTemplates)
      .where(
        and(
          eq(workoutTemplates.id, id),
          eq(workoutTemplates.userId, session.user.id),
          isNull(workoutTemplates.deletedAt),
        ),
      )
      .limit(1);
    if (!template) throw new ApiError(404, "Template not found");

    const rows = await db
      .select({
        exerciseId: templateExercises.exerciseId,
        defaultSets: templateExercises.defaultSets,
        defaultReps: templateExercises.defaultReps,
        exerciseOrder: templateExercises.exerciseOrder,
        supersetGroup: templateExercises.supersetGroup,
        name: exercisesTable.name,
        primaryMuscleGroup: exercisesTable.primaryMuscleGroup,
        equipment: exercisesTable.equipment,
      })
      .from(templateExercises)
      .innerJoin(exercisesTable, eq(templateExercises.exerciseId, exercisesTable.id))
      .where(eq(templateExercises.workoutTemplateId, template.id))
      .orderBy(asc(templateExercises.exerciseOrder));

    const result = generateWorkout(
      rows.map((r) => ({
        exerciseId: r.exerciseId,
        defaultSets: r.defaultSets,
        defaultReps: r.defaultReps,
        exerciseOrder: r.exerciseOrder,
        supersetGroup: r.supersetGroup,
      })),
      targetMinutes,
    );

    // Decorate the response with display data so the client doesn't have to
    // join again.
    const exerciseInfo = new Map(rows.map((r) => [r.exerciseId, r]));

    const planWithMeta = result.plan.map((entry) => {
      const meta = exerciseInfo.get(entry.exerciseId);
      return {
        ...entry,
        name: meta?.name ?? "(unknown)",
        primaryMuscleGroup: meta?.primaryMuscleGroup ?? "other",
        equipment: meta?.equipment ?? "other",
      };
    });

    const droppedWithMeta = result.dropped.map((entry) => {
      const meta = exerciseInfo.get(entry.exerciseId);
      return {
        exerciseId: entry.exerciseId,
        name: meta?.name ?? "(unknown)",
        primaryMuscleGroup: meta?.primaryMuscleGroup ?? "other",
        equipment: meta?.equipment ?? "other",
        defaultSets: entry.defaultSets,
        defaultReps: entry.defaultReps,
      };
    });

    return Response.json({
      plan: planWithMeta,
      dropped: droppedWithMeta,
      estimatedMinutes: result.estimatedMinutes,
      changed: result.changed,
      targetMinutes,
    });
  } catch (err) {
    return jsonError(err);
  }
}
