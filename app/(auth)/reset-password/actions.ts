"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyResetToken } from "@/lib/auth/reset";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type ResetState = { error?: string };

export async function resetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const userId = await verifyResetToken(parsed.data.token);
  if (!userId) {
    return { error: "This reset link is invalid or has expired. Start again." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });
  await audit({
    userId,
    action: "password_reset",
    entityType: "user",
    entityId: userId,
    description: "Password reset via forgot-password flow",
  });

  redirect("/login?reset=1");
}
