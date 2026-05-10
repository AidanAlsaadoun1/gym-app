import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, setsLog } from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { logSetSchema } from "@/lib/api/schemas";
import { num } from "@/lib/api/serialize";

export const runtime = "nodejs";

/**
 * POST /api/sessions/:id/sets — log a set.
 * Body: { exerciseId, setNumber, weightKg, repsCompleted, rpe?, isWarmup? }
 *
 * The session must belong to the user and still be in progress (endTime
 * null) — once finished we don't accept new sets.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const input = logSetSchema.parse(body);

    const [s] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.id, id),
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
        setNumber: input.setNumber,
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
