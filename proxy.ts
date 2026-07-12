import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const PROTECTED_PREFIXES = ["/dashboard", "/leagues", "/admin"];
const AUTH_ROUTES = ["/login", "/signup"];

/**
 * Optimistic-only check: presence of the session cookie, no signature verification.
 * Real authorization always happens in lib/auth/dal.ts against every protected
 * Server Component / Server Action / Route Handler.
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSessionCookie = Boolean(req.cookies.get(SESSION_COOKIE_NAME)?.value);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (isProtected && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  const isAuthRoute = AUTH_ROUTES.includes(pathname);
  if (isAuthRoute && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico)$).*)"],
};
