"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signResetToken } from "@/lib/auth/reset";
import { rateLimit } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/audit";

// Identity is proven by email + staff ID (no email service in this project). On success we
// mint a short-lived reset token and forward to the reset page — this is the step an email
// link would perform in production.

const schema = z.object({
  email: z.string().email(),
  staffId: z.string().min(1),
});

export type ForgotState = { error?: string };

export async function forgotAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    staffId: formData.get("staffId"),
  });
  if (!parsed.success) return { error: "Enter your email and staff ID." };

  const ip = clientIp();
  if (!rateLimit(`forgot:${ip}`, 5, 60_000).allowed) {
    return { error: "Too many attempts. Please wait a minute." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user || !user.isActive || !user.staffId || user.staffId !== parsed.data.staffId) {
    return { error: "We couldn't verify those details. Check your email and staff ID." };
  }

  const token = await signResetToken(user.id);
  redirect(`/reset-password?token=${encodeURIComponent(token)}`);
}
