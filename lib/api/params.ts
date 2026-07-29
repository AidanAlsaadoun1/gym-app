import { z } from "zod";

import { ApiError } from "@/lib/api/auth";

const uuidSchema = z.string().uuid();

/**
 * Validates a dynamic route segment before it reaches a `uuid` comparison.
 *
 * Without this, `GET /api/sessions/foo` reached Postgres and blew up with
 * `22P02 invalid input syntax for type uuid` — a 500 and a logged stack trace
 * for what is plainly a bad URL.
 */
export function requireUuid(value: string, label = "id"): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw new ApiError(404, `Invalid ${label}`);
  return result.data;
}

/** Parses a JSON body, treating malformed/empty bodies as `{}` so zod owns the 400. */
export async function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => ({}));
}
