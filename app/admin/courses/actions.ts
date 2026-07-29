"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { courseSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { type ActionState, zodFieldErrors } from "@/lib/crud";

export async function saveCourse(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertAdmin();
  const idRaw = formData.get("id");
  const parsed = courseSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    creditUnits: formData.get("creditUnits"),
    departmentId: formData.get("departmentId"),
    level: formData.get("level"),
    expectedStudents: formData.get("expectedStudents"),
    semester: formData.get("semester"),
    sessionId: formData.get("sessionId"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    if (idRaw) {
      const id = Number(idRaw);
      await prisma.course.update({ where: { id }, data: parsed.data });
      await audit({ action: "update", entityType: "course", entityId: id, description: `Updated course ${parsed.data.code}` });
    } else {
      const c = await prisma.course.create({ data: parsed.data });
      await audit({ action: "create", entityType: "course", entityId: c.id, description: `Created course ${parsed.data.code}` });
    }
  } catch (e: any) {
    if (e?.code === "P2002") return { fieldErrors: { code: "That course code already exists in this session." } };
    return { error: "Could not save the course." };
  }
  revalidatePath("/admin/courses");
  return { ok: true };
}

export async function deleteCourse(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("id"));
  try {
    await prisma.course.delete({ where: { id } });
    await audit({ action: "delete", entityType: "course", entityId: id, description: `Deleted course #${id}` });
  } catch {
    // Referenced by allocations — keep it.
  }
  revalidatePath("/admin/courses");
}
