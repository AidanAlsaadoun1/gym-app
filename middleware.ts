import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cookie-presence check only — fast, no DB hit. Actual session validation
  // happens inside route handlers / server components via auth.api.getSession.
  // (See better-auth docs: do not call DB in middleware.)
  const sessionCookie = getSessionCookie(request);
  const isAuthed = Boolean(sessionCookie);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // API routes get JSON, never an HTML redirect. A 307 to /login returned the
  // login *page* with status 200, so a fetch that hit an expired cookie saw
  // `res.ok === true` and then threw parsing HTML as JSON — mid-workout that
  // surfaced as "Could not log set" with no hint that re-authenticating was the
  // fix, and the set was silently lost.
  if (!isAuthed && pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized", code: "unauthenticated" },
      { status: 401 },
    );
  }

  if (!isAuthed && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthed && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except Next internals, the auth API, and static assets.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|manifest.json|icons/).*)"],
};
