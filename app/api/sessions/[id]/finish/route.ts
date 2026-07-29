import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { requireUuid } from "@/lib/api/params";

export const runtime = "nodejs";

/**
 * POST /api/sessions/:id/finish — stamp the session as finished.
 *
 * Ownership and the "still in progress" check live in the UPDATE's own WHERE
 * clause, so the database itself decides the winner. The previous version
 * checked `end_time IS NULL` in a preceding SELECT and then updated on `id`
 * alone: under READ COMMITTED both halves of a double-tap saw a null end_time
 * and both wrote, so the stored duration came from whichever request landed
 * last rather than the one the user watched finish.
 *
 * An empty `returning()` now means "not yours, or already finished" — the same
 * 404 as before, without the transaction.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const sessionId = requireUuid(id, "session id");

    const [finished] = await db
      .update(sessions)
      .set({ endTime: new Date() })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, session.user.id),
          isNull(sessions.endTime),
        ),
      )
      .returning();

    if (!finished) {
      throw new ApiError(404, "Session not found or already finished");
    }

    return Response.json({ session: finished });
  } catch (err) {
    return jsonError(err);
  }
}
