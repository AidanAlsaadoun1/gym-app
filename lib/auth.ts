import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";
import * as schema from "./db/schema";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is not set");
}

/**
 * Derive the set of origins that better-auth should accept incoming auth
 * requests from. We always trust the canonical `baseURL`, plus its www /
 * apex sibling so visitors on either form work without a redirect-induced
 * CORS failure. Add additional origins here if you start serving the app
 * from extra hosts (preview URLs, custom subdomains, etc.).
 */
function buildTrustedOrigins(baseURL: string | undefined): string[] {
  const origins = new Set<string>();
  if (baseURL) {
    origins.add(baseURL);
    try {
      const u = new URL(baseURL);
      if (u.hostname.startsWith("www.")) {
        origins.add(`${u.protocol}//${u.hostname.slice(4)}`);
      } else {
        origins.add(`${u.protocol}//www.${u.hostname}`);
      }
    } catch {
      // baseURL wasn't a valid URL — fine, just skip the sibling.
    }
  }
  origins.add("http://localhost:3000");
  return Array.from(origins);
}

/**
 * Shared auth options used by both the running app and the bootstrap script.
 *
 * The bootstrap script (`scripts/create-user.ts`) overrides
 * `emailAndPassword.disableSignUp` so it can create the first account; the
 * exported `auth` instance below keeps sign-up disabled, which is what serves
 * the public HTTP route at /api/auth/*.
 */
export const authOptions: BetterAuthOptions = {
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: buildTrustedOrigins(process.env.BETTER_AUTH_URL),
  secret: process.env.BETTER_AUTH_SECRET,
  // nextCookies() must be the last plugin so it can capture Set-Cookie
  // headers from server actions and forward them to Next's cookie store.
  plugins: [nextCookies()],
};

export const auth = betterAuth(authOptions);

export type Auth = typeof auth;
