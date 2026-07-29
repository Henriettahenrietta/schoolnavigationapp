import { SignJWT, jwtVerify } from "jose";

// Short-lived signed tokens for the password-reset flow. Because the project uses no paid
// email service, identity is proven by email + staff ID (see the forgot-password action)
// and this token then authorises a single password change. In production this token would
// be delivered by email instead.

const RESET_TTL = "15m";

function key(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  // Namespaced so a reset token can never be used as a session token.
  return new TextEncoder().encode(secret + ":reset");
}

export async function signResetToken(userId: number): Promise<string> {
  return new SignJWT({ userId, purpose: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(RESET_TTL)
    .sign(key());
}

export async function verifyResetToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    if (payload.purpose !== "reset") return null;
    return Number(payload.userId);
  } catch {
    return null;
  }
}
