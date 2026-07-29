"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/auth/password";
import { startSession, homePathForRole } from "@/lib/auth/current-user";
import { rateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { audit, clientIp } from "@/lib/audit";
import type { Role } from "@/lib/constants";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  // Rate-limit by IP: 5 attempts per minute.
  const ip = clientIp();
  const limit = rateLimit(`login:${ip}`, 5, 60_000);
  if (!limit.allowed) {
    return { error: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  // Uniform error message — never reveal whether the email exists.
  const invalid = { error: "Invalid email or password." };
  if (!user || !user.isActive) return invalid;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await audit({
      userId: user.id,
      action: "login_failed",
      entityType: "user",
      entityId: user.id,
      description: `Failed login for ${email}`,
    });
    return invalid;
  }

  resetRateLimit(`login:${ip}`);
  await startSession({
    userId: user.id,
    role: user.role as Role,
    name: user.name,
    email: user.email,
  });
  await audit({
    userId: user.id,
    action: "login",
    entityType: "user",
    entityId: user.id,
    description: `${user.name} logged in`,
  });

  redirect(homePathForRole(user.role as Role));
}
