/**
 * Bootstrap script — creates the single account for this app.
 *
 * Run once after the database is migrated:
 *   pnpm user:create
 *
 * The production `auth` instance has `disableSignUp: true` to keep the public
 * /api/auth/sign-up/email route closed. better-auth enforces that flag at the
 * options level, not just at the HTTP boundary, so the internal
 * `auth.api.signUpEmail` call would also be rejected. This script builds a
 * one-off auth instance with sign-up enabled and uses it just for bootstrap.
 *
 * Env vars are loaded by tsx via `--env-file=.env.local` (see package.json).
 */
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { betterAuth } from "better-auth";

import { authOptions } from "../lib/auth";
import { db } from "../lib/db";
import { user } from "../lib/db/schema";

async function main() {
  const existing = await db.select().from(user).limit(1);
  if (existing.length > 0) {
    console.error(
      `A user already exists (${existing[0].email}). This script is intended for first-run setup only.`,
    );
    process.exit(1);
  }

  const rl = createInterface({ input, output });
  const email = (await rl.question("Email: ")).trim();
  const name = (await rl.question("Name: ")).trim();
  const password = (await rl.question("Password (min 8 chars): ")).trim();
  rl.close();

  if (!email || !name || password.length < 8) {
    console.error("Email, name, and a password of 8+ characters are required.");
    process.exit(1);
  }

  // One-off auth instance with sign-up enabled, just for this script.
  const bootstrapAuth = betterAuth({
    ...authOptions,
    emailAndPassword: {
      ...authOptions.emailAndPassword,
      enabled: true,
      disableSignUp: false,
    },
  });

  const result = await bootstrapAuth.api.signUpEmail({
    body: { email, name, password },
  });

  console.log(`Created user: ${result.user.email} (${result.user.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
