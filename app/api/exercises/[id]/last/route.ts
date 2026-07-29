import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, setsLog } from "@/lib/db/schema";
import { jsonError, requireSession } from "@/lib/api/auth";
import { requireUuid } from "@/lib/api/params";
import { num } from "@/lib/api/serialize";

export const runtime = "nodejs";

/**
 * GET /api/exercises/:id/last
 *
 * Returns the user's sets for this exercise from their most recent
 * *completed* session. Used by the live screen to show a "Last: 80kg ×
 * 5,5,4" hint and feed the progression suggestion.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const exerciseId = requireUuid(id, "exercise id");

    // Find the most recent completed session that contains this exercise.
    const [latest] = await db
      .select({
        sessionId: sessions.id,
        startTime: sessions.startTime,
        endTime: sessions.endTime,
      })
      .from(sessions)
      .innerJoin(setsLog, eq(setsLog.sessionId, sessions.id))
      .where(
        and(
          eq(sessions.userId, session.user.id),
          isNotNull(sessions.endTime),
          eq(setsLog.exerciseId, exerciseId),
        ),
      )
      .orderBy(desc(sessions.startTime))
      .limit(1);

    if (!latest) {
      return Response.json({ session: null, sets: [] });
    }

    const setsRaw = await db
      .select()
      .from(setsLog)
      .where(
        and(
          eq(setsLog.sessionId, latest.sessionId),
          eq(setsLog.exerciseId, exerciseId),
        ),
      )
      .orderBy(asc(setsLog.setNumber), asc(setsLog.completedAt));

    const sets = setsRaw.map((row) => ({
      setNumber: row.setNumber,
      weightKg: num(row.weightKg),
      repsCompleted: row.repsCompleted,
      isWarmup: row.isWarmup,
    }));

    return Response.json({
      session: { id: latest.sessionId, startTime: latest.startTime, endTime: latest.endTime },
      sets,
    });
  } catch (err) {
    return jsonError(err);
  }
}
