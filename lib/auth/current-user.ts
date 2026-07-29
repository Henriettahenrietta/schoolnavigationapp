import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "../prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";
import type { Role } from "../constants";
import type { SessionPayload } from "./session";

// Server-side helpers to read the current user from the session cookie. Use these in
// server components, layouts and server actions (they touch the DB and next/headers, so
// they never run in Edge middleware — middleware does its own lightweight JWT check).

/** The verified session payload, or null if not logged in. */
export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySession(token);
}

/** The full User record for the current session, or null. Also nulls out disabled users. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { department: true },
  });
  if (!user || !user.isActive) return null;
  return user;
}

/** Require any authenticated user; redirect to /login otherwise. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a specific role; redirect appropriately otherwise. */
export async function requireRole(role: Role) {
  const user = await requireUser();
  if (user.role !== role) {
    // Send users to their own home rather than exposing a forbidden page.
    redirect(homePathForRole(user.role as Role));
  }
  return user;
}

/**
 * For use inside server actions (mutations): ensure the caller is an admin, throwing
 * instead of redirecting so the action fails loudly rather than silently.
 */
export async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized: admin access required");
  return user;
}

export function homePathForRole(role: Role): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "lecturer":
      return "/lecturer";
    default:
      return "/";
  }
}

/** Write the session cookie (called from login/register server actions). */
export async function startSession(payload: SessionPayload) {
  const token = await signSession(payload);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Clear the session cookie (logout). */
export function endSession() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
