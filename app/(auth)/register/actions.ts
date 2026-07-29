"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lecturerRegisterSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/current-user";
import { audit } from "@/lib/audit";

export type RegisterState = { error?: string; fieldErrors?: Record<string, string> };

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = lecturerRegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    staffId: formData.get("staffId"),
    departmentId: formData.get("departmentId"),
    phone: formData.get("phone") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "", fieldErrors: { email: "That email is already registered." } };
  }

  // Ensure the department exists.
  const dept = await prisma.department.findUnique({ where: { id: data.departmentId } });
  if (!dept) {
    return { error: "", fieldErrors: { departmentId: "Select a valid department." } };
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      passwordHash: await hashPassword(data.password),
      role: "lecturer",
      staffId: data.staffId,
      departmentId: data.departmentId,
      phone: data.phone || null,
      isActive: true,
    },
  });

  await audit({
    userId: user.id,
    action: "register",
    entityType: "user",
    entityId: user.id,
    description: `Lecturer ${user.name} self-registered`,
  });

  await startSession({
    userId: user.id,
    role: "lecturer",
    name: user.name,
    email: user.email,
  });

  redirect("/lecturer");
}
