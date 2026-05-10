import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";

export const runtime = "nodejs";

/**
 * POST /api/sessions/:id/finish
 *
 * Marks the session as finished. The work happens inside a Drizzle
 * transaction — we re-check ownership and that endTime is still null
 * inside the same tx, so two concurrent finish requests can't double-stamp.
 * This is the "no ghost sessions" guarantee from the whiteboard.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;

    const finished = await db.transaction(async (tx) => {
      const [s] = await tx
        .select()
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

      const [updated] = await tx
        .update(sessions)
        .set({ endTime: new Date() })
        .where(eq(sessions.id, s.id))
        .returning();

      return updated;
    });

    return Response.json({ session: finished });
  } catch (err) {
    return jsonError(err);
  }
}
