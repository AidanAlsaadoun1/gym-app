import { Resend } from "resend";

/**
 * Lazy singleton wrapper around the Resend SDK. We don't want the import to
 * throw if RESEND_API_KEY is missing at build time — instead callers ask for
 * the client and get a clear error if it's not configured.
 */
let cached: Resend | null | undefined;

export function getResend(): Resend | null {
  if (cached !== undefined) return cached;
  const key = process.env.RESEND_API_KEY;
  cached = key ? new Resend(key) : null;
  return cached;
}
