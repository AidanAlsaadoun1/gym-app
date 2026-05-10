"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Intentionally no baseURL — we want the auth client to use whatever origin
 * the page is currently on. Hardcoding to NEXT_PUBLIC_APP_URL causes CORS
 * errors whenever the browser ends up on a different host (e.g. www vs
 * apex, or a Vercel preview URL that redirects to the canonical domain).
 */
export const authClient = createAuthClient();

export const { signIn, signOut, useSession } = authClient;
