import { SignJWT, jwtVerify } from "jose";
import type { Role } from "../constants";

// Signed-JWT session stored in an httpOnly cookie. `jose` is used because it runs in both
// the Node runtime (server actions) and the Edge runtime (middleware).

export const SESSION_COOKIE = "cas_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8-hour session timeout

export type SessionPayload = {
  userId: number;
  role: Role;
  name: string;
  email: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET is missing or too short (set it in .env)");
  }
  return new TextEncoder().encode(secret);
}

/** Create a signed session token (HS256) that expires in 8 hours. */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Verify a token and return its payload, or null if invalid/expired. */
export async function verifySession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return {
      userId: Number(payload.userId),
      role: payload.role as Role,
      name: String(payload.name),
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
