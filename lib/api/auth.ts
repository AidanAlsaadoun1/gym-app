import { headers } from "next/headers";
import { ZodError } from "zod";
import { auth } from "@/lib/auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Throws ApiError(401) if the request is not authenticated. In API route
 * handlers we catch ApiError and convert it to a JSON Response — keeps
 * happy paths free of nullable-session noise.
 */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new ApiError(401, "Unauthorized");
  return session;
}

export function jsonError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const path = first?.path.join(".");
    return Response.json(
      {
        error: path ? `${path}: ${first?.message}` : (first?.message ?? "Invalid input"),
        issues: error.issues,
      },
      { status: 400 },
    );
  }
  console.error("API error:", error);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
