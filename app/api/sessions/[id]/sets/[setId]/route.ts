import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, setsLog } from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { updateSetSchema } from "@/lib/api/schemas";
import { num } from "@/lib/api/serialize";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string; setId: string }> };

async function loadOwnedSet(setId: string, sessionId: string, userId: string) {
  const [row] = await db
    .select({ set: setsLog, sessionId: sessions.id })
    .from(setsLog)
    .innerJoin(sessions, eq(sessions.id, setsLog.sessionId))
    .where(
      and(
        eq(setsLog.id, setId),
        eq(setsLog.sessionId, sessionId),
        eq(sessions.userId, userId),
      ),
    )
    .limit(1);
  if (!row) throw new ApiError(404, "Set not found");
  return row.set;
}

/** PATCH /api/sessions/:id/sets/:setId — edit a logged set. */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id, setId } = await params;
    const existing = await loadOwnedSet(setId, id, session.user.id);

    const body = await request.json();
    const input = updateSetSchema.parse(body);

    const updates: Partial<typeof setsLog.$inferInsert> = {};
    if (input.weightKg !== undefined) updates.weightKg = input.weightKg.toString();
    if (input.repsCompleted !== undefined) updates.repsCompleted = input.repsCompleted;
    if (input.rpe !== undefined)
      updates.rpe = input.rpe === null ? null : input.rpe.toString();
    if (input.isWarmup !== undefined) updates.isWarmup = input.isWarmup;

    const [row] = await db
      .update(setsLog)
      .set(updates)
      .where(eq(setsLog.id, existing.id))
      .returning();

    return Response.json({
      set: {
        ...row,
        weightKg: num(row.weightKg),
        rpe: num(row.rpe),
      },
    });
  } catch (err) {
    return jsonError(err);
  }
}

/** DELETE /api/sessions/:id/sets/:setId — remove a logged set. */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id, setId } = await params;
    const existing = await loadOwnedSet(setId, id, session.user.id);

    await db.delete(setsLog).where(eq(setsLog.id, existing.id));
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
