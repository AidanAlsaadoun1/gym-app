import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  exercises as exercisesTable,
  templateExercises,
  workoutTemplates,
} from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { readJson, requireUuid } from "@/lib/api/params";
import { updateTemplateSchema } from "@/lib/api/schemas";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

async function loadOwnedTemplate(id: string, userId: string) {
  const [template] = await db
    .select()
    .from(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.id, id),
        eq(workoutTemplates.userId, userId),
        isNull(workoutTemplates.deletedAt),
      ),
    )
    .limit(1);
  if (!template) throw new ApiError(404, "Template not found");
  return template;
}

/** GET /api/workout-templates/:id — template + ordered exercises (joined with the library). */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const template = await loadOwnedTemplate(
      requireUuid(id, "template id"),
      session.user.id,
    );

    const rows = await db
      .select({
        id: templateExercises.id,
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

    return Response.json({ template, exercises: rows });
  } catch (err) {
    return jsonError(err);
  }
}

/**
 * PATCH /api/workout-templates/:id
 *
 * Updates template metadata and/or replaces the entire exercise list. The
 * "replace whole list" pattern keeps the client model dead simple: it sends
 * the desired final state, the server diffs by transaction. We could
 * granular-diff later but YAGNI for one user.
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const template = await loadOwnedTemplate(
      requireUuid(id, "template id"),
      session.user.id,
    );

    const input = updateTemplateSchema.parse(await readJson(request));

    await db.transaction(async (tx) => {
      const updates: Partial<typeof workoutTemplates.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) updates.name = input.name;
      if (input.splitType !== undefined) updates.splitType = input.splitType;
      if (input.estimatedMinutes !== undefined)
        updates.estimatedMinutes = input.estimatedMinutes;

      await tx
        .update(workoutTemplates)
        .set(updates)
        .where(eq(workoutTemplates.id, template.id));

      if (input.exercises !== undefined) {
        await tx
          .delete(templateExercises)
          .where(eq(templateExercises.workoutTemplateId, template.id));

        if (input.exercises.length > 0) {
          await tx.insert(templateExercises).values(
            input.exercises.map((ex) => ({
              workoutTemplateId: template.id,
              exerciseId: ex.exerciseId,
              defaultSets: ex.defaultSets,
              defaultReps: ex.defaultReps,
              exerciseOrder: ex.exerciseOrder,
              supersetGroup: ex.supersetGroup ?? null,
            })),
          );
        }
      }
    });

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

/** DELETE /api/workout-templates/:id — soft delete (sets deleted_at). */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const template = await loadOwnedTemplate(
      requireUuid(id, "template id"),
      session.user.id,
    );

    await db
      .update(workoutTemplates)
      .set({ deletedAt: new Date() })
      .where(eq(workoutTemplates.id, template.id));

    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
