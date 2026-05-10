import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, workoutTemplates } from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { startSessionSchema } from "@/lib/api/schemas";

export const runtime = "nodejs";

/**
 * POST /api/sessions — start a new session.
 * Body: {
 *   workoutTemplateId?: uuid | null,
 *   plan?: SessionPlanEntry[] | null,  // generated plan snapshot
 * }
 *
 * If a templateId is provided we verify the template belongs to the user
 * (and isn't soft-deleted) before linking the session to it. The optional
 * `plan` is stored verbatim and used by the live screen instead of the
 * template's current `template_exercises`.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => ({}));
    const input = startSessionSchema.parse(body);

    if (input.workoutTemplateId) {
      const [template] = await db
        .select({ id: workoutTemplates.id })
        .from(workoutTemplates)
        .where(
          and(
            eq(workoutTemplates.id, input.workoutTemplateId),
            eq(workoutTemplates.userId, session.user.id),
            isNull(workoutTemplates.deletedAt),
          ),
        )
        .limit(1);
      if (!template) throw new ApiError(404, "Template not found");
    }

    const planForDb =
      input.plan && input.plan.length > 0
        ? input.plan.map((entry) => ({
            exerciseId: entry.exerciseId,
            defaultSets: entry.defaultSets,
            defaultReps: entry.defaultReps,
            exerciseOrder: entry.exerciseOrder,
            supersetGroup: entry.supersetGroup ?? null,
          }))
        : null;

    const [created] = await db
      .insert(sessions)
      .values({
        userId: session.user.id,
        workoutTemplateId: input.workoutTemplateId ?? null,
        plan: planForDb,
      })
      .returning();

    return Response.json({ session: created }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
