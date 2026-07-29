"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { audit } from "@/lib/audit";
import { type ActionState, zodFieldErrors } from "@/lib/crud";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  staffId: z.string().min(1).max(40),
  departmentId: z.coerce.number().int().positive(),
  phone: z.string().max(30).optional().or(z.literal("")),
  isActive: z.coerce.boolean().optional().default(true),
});

export async function saveLecturer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertAdmin();
  const idRaw = formData.get("id");
  const password = String(formData.get("password") ?? "");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    staffId: formData.get("staffId"),
    departmentId: formData.get("departmentId"),
    phone: formData.get("phone") ?? "",
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const email = d.email.toLowerCase();

  try {
    if (idRaw) {
      const id = Number(idRaw);
      const data: any = {
        name: d.name,
        email,
        staffId: d.staffId,
        departmentId: d.departmentId,
        phone: d.phone || null,
        isActive: d.isActive,
      };
      if (password) {
        if (password.length < 6) return { fieldErrors: { password: "At least 6 characters." } };
        data.passwordHash = await hashPassword(password);
      }
      await prisma.user.update({ where: { id }, data });
      await audit({ action: "update", entityType: "user", entityId: id, description: `Updated lecturer ${d.name}` });
    } else {
      if (password.length < 6) return { fieldErrors: { password: "At least 6 characters (required for new lecturers)." } };
      const u = await prisma.user.create({
        data: {
          name: d.name,
          email,
          staffId: d.staffId,
          departmentId: d.departmentId,
          phone: d.phone || null,
          isActive: d.isActive,
          role: "lecturer",
          passwordHash: await hashPassword(password),
        },
      });
      await audit({ action: "create", entityType: "user", entityId: u.id, description: `Created lecturer ${d.name}` });
    }
  } catch (e: any) {
    if (e?.code === "P2002") return { fieldErrors: { email: "That email is already registered." } };
    return { error: "Could not save the lecturer." };
  }
  revalidatePath("/admin/lecturers");
  return { ok: true };
}

export async function deleteLecturer(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("id"));
  try {
    // Only allow removing lecturers with no allocations; otherwise deactivate.
    const allocations = await prisma.allocation.count({ where: { lecturerId: id } });
    if (allocations > 0) {
      await prisma.user.update({ where: { id }, data: { isActive: false } });
      await audit({ action: "deactivate", entityType: "user", entityId: id, description: `Deactivated lecturer #${id} (has allocations)` });
    } else {
      await prisma.user.delete({ where: { id } });
      await audit({ action: "delete", entityType: "user", entityId: id, description: `Deleted lecturer #${id}` });
    }
  } catch {
    // ignore
  }
  revalidatePath("/admin/lecturers");
}
