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
