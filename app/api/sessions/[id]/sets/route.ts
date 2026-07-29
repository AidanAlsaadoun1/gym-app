import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, setsLog } from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { readJson, requireUuid } from "@/lib/api/params";
import { logSetSchema } from "@/lib/api/schemas";
import { num } from "@/lib/api/serialize";

export const runtime = "nodejs";

/**
 * POST /api/sessions/:id/sets — log a set.
 * Body: { exerciseId, weightKg, repsCompleted, rpe?, isWarmup? }
 *
 * The session must belong to the user and still be in progress (endTime
 * null) — once finished we don't accept new sets.
 *
 * `setNumber` is assigned here, from MAX(set_number) + 1 for this
 * session/exercise. It used to come from the client as
 * `existingSets.length + 1`, which collided as soon as a set was deleted:
 * logging 1,2,3 then deleting #2 produced a second row numbered 3, and the
 * duplicate then made "last time I did this exercise" resolve to an arbitrary
 * one of the two — so the next session's suggested weight could come from the
 * wrong set. A client-supplied `setNumber` is now accepted but ignored.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const sessionId = requireUuid(id, "session id");
    const input = logSetSchema.parse(await readJson(request));

    const [s] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, session.user.id),
          isNull(sessions.endTime),
        ),
      )
      .limit(1);
    if (!s) throw new ApiError(404, "Session not found or already finished");

    const [row] = await db
      .insert(setsLog)
      .values({
        sessionId: s.id,
        exerciseId: input.exerciseId,
        setNumber: sql`(
          SELECT COALESCE(MAX(${setsLog.setNumber}), 0) + 1
          FROM ${setsLog}
          WHERE ${setsLog.sessionId} = ${s.id}
            AND ${setsLog.exerciseId} = ${input.exerciseId}
        )`,
        // Drizzle accepts a number for numeric columns and stringifies it.
        weightKg: input.weightKg.toString(),
        repsCompleted: input.repsCompleted,
        rpe: input.rpe != null ? input.rpe.toString() : null,
        isWarmup: input.isWarmup ?? false,
      })
      .returning();

    return Response.json(
      {
        set: {
          ...row,
          weightKg: num(row.weightKg),
          rpe: num(row.rpe),
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return jsonError(err);
  }
}
