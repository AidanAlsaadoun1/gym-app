import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { exercises, sessions, workoutTemplates } from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { readJson } from "@/lib/api/params";
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
 *
 * Only one session may be in progress at a time. Starting a second one used to
 * succeed silently, and since the home screen only ever surfaces the newest
 * unfinished session, the older one became unreachable — it could never be
 * finished, so every set logged into it was excluded from history and stats
 * forever. We now return 409 with the existing session so the client can offer
 * "resume or discard" instead.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const input = startSessionSchema.parse(await readJson(request));

    const [existing] = await db
      .select({
        id: sessions.id,
        startTime: sessions.startTime,
        workoutTemplateId: sessions.workoutTemplateId,
      })
      .from(sessions)
      .where(
        and(eq(sessions.userId, session.user.id), isNull(sessions.endTime)),
      )
      .orderBy(desc(sessions.startTime))
      .limit(1);

    if (existing) {
      return Response.json(
        {
          error: "A workout is already in progress",
          code: "session_in_progress",
          session: existing,
        },
        { status: 409 },
      );
    }

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

    // `plan` is jsonb, so no foreign key protects it. An unknown-but-valid uuid
    // used to render as an exercise called "(unknown)" that the user could log
    // sets against — and *that* insert then failed on the real FK with a 500.
    if (planForDb) {
      const planIds = Array.from(new Set(planForDb.map((p) => p.exerciseId)));
      const known = await db
        .select({ id: exercises.id })
        .from(exercises)
        .where(inArray(exercises.id, planIds));
      if (known.length !== planIds.length) {
        throw new ApiError(400, "Plan references an unknown exercise");
      }
    }

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
