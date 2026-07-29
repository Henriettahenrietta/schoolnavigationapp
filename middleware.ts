import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/auth/session";

// Edge middleware: the first line of role-based access control. It only verifies the
// signed JWT (no DB access — that happens in server components). Server-side guards
// (requireRole) are the authoritative second check.

const ADMIN_PREFIX = "/admin";
const LECTURER_PREFIX = "/lecturer";
// Routes reachable only when logged OUT (redirect logged-in users away).
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

function homeFor(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "lecturer") return "/lecturer";
  return "/";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  const isAdminArea = pathname.startsWith(ADMIN_PREFIX);
  const isLecturerArea = pathname.startsWith(LECTURER_PREFIX);
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  // Logged-in users shouldn't see the auth pages.
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }

  // Protected areas require a session.
  if ((isAdminArea || isLecturerArea) && !session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Enforce role separation.
  if (isAdminArea && session && session.role !== "admin") {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }
  if (isLecturerArea && session && session.role !== "lecturer") {
    return NextResponse.redirect(new URL(homeFor(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/lecturer/:path*", "/login", "/register", "/forgot-password", "/reset-password"],
};
