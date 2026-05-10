import { ApiError, jsonError, requireSession } from "@/lib/api/auth";
import { bugReportSchema } from "@/lib/api/schemas";
import {
  EmailNotConfiguredError,
  sendBugReport,
} from "@/lib/email/send-bug-report";

export const runtime = "nodejs";

/**
 * POST /api/bug-reports
 *
 * Auth-gated. Pulls the reporter identity from the better-auth session
 * (never trust client-supplied "from" fields) and ships the report to the
 * email configured in BUG_REPORT_TO_EMAIL via Resend.
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const input = bugReportSchema.parse(body);

    await sendBugReport({
      reporterName: session.user.name,
      reporterEmail: session.user.email,
      title: input.title,
      description: input.description,
      url: input.url,
      userAgent: request.headers.get("user-agent") ?? undefined,
    });

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof EmailNotConfiguredError) {
      return Response.json(
        {
          error:
            "Bug report email isn't configured. Ask the admin to set RESEND_API_KEY + BUG_REPORT_TO_EMAIL.",
        },
        { status: 503 },
      );
    }
    if (err instanceof ApiError) return jsonError(err);
    return jsonError(err);
  }
}
