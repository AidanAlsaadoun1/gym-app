import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sessions, setsLog } from "@/lib/db/schema";
import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { readJson, requireUuid } from "@/lib/api/params";
import { updateSessionSchema } from "@/lib/api/schemas";
import { num } from "@/lib/api/serialize";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

async function loadOwnedSession(id: string, userId: string) {
  const [s] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
    .limit(1);
  if (!s) throw new ApiError(404, "Session not found");
  return s;
}

/** GET /api/sessions/:id — session + ordered sets log. */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const s = await loadOwnedSession(
      requireUuid(id, "session id"),
      session.user.id,
    );

    const setsRaw = await db
      .select()
      .from(setsLog)
      .where(eq(setsLog.sessionId, s.id))
      .orderBy(asc(setsLog.completedAt));

    const sets = setsRaw.map((row) => ({
      ...row,
      weightKg: num(row.weightKg),
      rpe: num(row.rpe),
    }));

    return Response.json({ session: s, sets });
  } catch (err) {
    return jsonError(err);
  }
}

/** PATCH /api/sessions/:id — update notes. */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const s = await loadOwnedSession(
      requireUuid(id, "session id"),
      session.user.id,
    );

    const input = updateSessionSchema.parse(await readJson(request));

    // An omitted `notes` means "leave it alone". Coalescing to null instead
    // meant `PATCH {}` erased whatever the user had written.
    if (input.notes !== undefined) {
      await db
        .update(sessions)
        .set({ notes: input.notes })
        .where(eq(sessions.id, s.id));
    }
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}

/** DELETE /api/sessions/:id — abandon a session entirely (cascades to sets). */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const s = await loadOwnedSession(
      requireUuid(id, "session id"),
      session.user.id,
    );

    await db.delete(sessions).where(eq(sessions.id, s.id));
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
