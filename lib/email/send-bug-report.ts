import { getResend } from "./resend";

export interface BugReportInput {
  reporterName: string;
  reporterEmail: string;
  title: string;
  description: string;
  url?: string;
  userAgent?: string;
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Bug report email isn't configured (missing RESEND_API_KEY or BUG_REPORT_TO_EMAIL)");
    this.name = "EmailNotConfiguredError";
  }
}

/**
 * Send a bug report to the email configured in BUG_REPORT_TO_EMAIL via Resend.
 *
 * - From address defaults to Resend's onboarding sandbox so this works
 *   without verifying a custom domain. Override with BUG_REPORT_FROM_EMAIL
 *   once you've verified skyeapp.fit in Resend.
 * - replyTo is set to the reporter's email so hitting Reply in your inbox
 *   goes back to the user.
 */
export async function sendBugReport(input: BugReportInput) {
  const resend = getResend();
  const to = process.env.BUG_REPORT_TO_EMAIL;
  if (!resend || !to) {
    throw new EmailNotConfiguredError();
  }

  // Fallback to Resend's sandbox sender unless an override is *non-empty*.
  // Treating an empty-string env var the same as "unset" prevents a blank
  // From: header sneaking in via Vercel UI quirks.
  const fromOverride = process.env.BUG_REPORT_FROM_EMAIL?.trim();
  const from =
    fromOverride && fromOverride.length > 0
      ? fromOverride
      : "Gym Bug Report <onboarding@resend.dev>";

  const subject = `[Gym bug] ${truncate(input.title, 100)}`;

  const lines = [
    `Reporter: ${input.reporterName} <${input.reporterEmail}>`,
    `URL: ${input.url ?? "(not provided)"}`,
    `User agent: ${input.userAgent ?? "(not provided)"}`,
    `Time: ${new Date().toISOString()}`,
    "",
    "------------------------------------------------------------",
    "",
    input.description,
  ];

  const text = lines.join("\n");
  const html = renderHtml({ ...input, subject });

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo: input.reporterEmail,
    subject,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message ?? "Resend rejected the message");
  }
  return data;
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function renderHtml(opts: BugReportInput & { subject: string }): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const descHtml = esc(opts.description).replace(/\n/g, "<br />");
  return `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; color:#111; line-height:1.5;">
  <h2 style="margin:0 0 8px;">${esc(opts.title)}</h2>
  <p style="margin:0; color:#666; font-size: 13px;">
    From <strong>${esc(opts.reporterName)}</strong>
    &lt;${esc(opts.reporterEmail)}&gt;
  </p>
  <table style="margin-top: 14px; font-size: 13px; color:#444;">
    <tr><td style="padding-right: 10px; color:#888;">URL</td><td>${esc(opts.url ?? "(not provided)")}</td></tr>
    <tr><td style="padding-right: 10px; color:#888;">User agent</td><td>${esc(opts.userAgent ?? "(not provided)")}</td></tr>
    <tr><td style="padding-right: 10px; color:#888;">Time</td><td>${new Date().toISOString()}</td></tr>
  </table>
  <hr style="margin: 18px 0; border: 0; border-top: 1px solid #eee;" />
  <div style="white-space: normal;">${descHtml}</div>
</body></html>`;
}
