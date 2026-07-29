import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { templateExercises, workoutTemplates } from "@/lib/db/schema";
import { jsonError, requireSession } from "@/lib/api/auth";
import { readJson } from "@/lib/api/params";
import { createTemplateSchema } from "@/lib/api/schemas";

export const runtime = "nodejs";

/** GET /api/workout-templates — list this user's templates with exercise counts. */
export async function GET() {
  try {
    const session = await requireSession();

    const rows = await db
      .select({
        id: workoutTemplates.id,
        name: workoutTemplates.name,
        splitType: workoutTemplates.splitType,
        estimatedMinutes: workoutTemplates.estimatedMinutes,
        createdAt: workoutTemplates.createdAt,
        updatedAt: workoutTemplates.updatedAt,
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
      .orderBy(desc(workoutTemplates.updatedAt));

    return Response.json({ templates: rows });
  } catch (err) {
    return jsonError(err);
  }
}

/** POST /api/workout-templates — create a new template (with optional exercise list). */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await readJson(request);
    const input = createTemplateSchema.parse(body);

    const created = await db.transaction(async (tx) => {
      const [template] = await tx
        .insert(workoutTemplates)
        .values({
          userId: session.user.id,
          name: input.name,
          splitType: input.splitType,
          estimatedMinutes: input.estimatedMinutes,
        })
        .returning();

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

      return template;
    });

    return Response.json({ template: created }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
