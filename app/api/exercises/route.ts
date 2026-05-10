import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { exercises, muscleGroupEnum } from "@/lib/db/schema";
import { jsonError, requireSession } from "@/lib/api/auth";

export const runtime = "nodejs";

const MUSCLE_GROUPS = new Set<string>(muscleGroupEnum.enumValues);

/** GET /api/exercises — global library, optionally filtered by ?muscle=quads. */
export async function GET(request: Request) {
  try {
    await requireSession();

    const { searchParams } = new URL(request.url);
    const muscle = searchParams.get("muscle");

    const select = db
      .select({
        id: exercises.id,
        name: exercises.name,
        primaryMuscleGroup: exercises.primaryMuscleGroup,
        secondaryMuscleGroups: exercises.secondaryMuscleGroups,
        equipment: exercises.equipment,
      })
      .from(exercises);

    const rows =
      muscle && MUSCLE_GROUPS.has(muscle)
        ? await select
            .where(
              eq(
                exercises.primaryMuscleGroup,
                muscle as (typeof muscleGroupEnum.enumValues)[number],
              ),
            )
            .orderBy(asc(exercises.name))
        : await select.orderBy(asc(exercises.name));

    return Response.json({ exercises: rows });
  } catch (err) {
    return jsonError(err);
  }
}
