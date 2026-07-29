import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";

// POST /logout — clears the session cookie and returns to the login page.
export async function POST(req: NextRequest) {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  // 303 so the POST becomes a GET on the redirect target.
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
