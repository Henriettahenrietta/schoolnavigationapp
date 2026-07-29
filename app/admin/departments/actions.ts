"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { departmentSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { type ActionState, zodFieldErrors } from "@/lib/crud";

export async function saveDepartment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();
  const idRaw = formData.get("id");
  const parsed = departmentSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    if (idRaw) {
      const id = Number(idRaw);
      await prisma.department.update({ where: { id }, data: parsed.data });
      await audit({ action: "update", entityType: "department", entityId: id, description: `Updated department ${parsed.data.code}` });
    } else {
      const created = await prisma.department.create({ data: parsed.data });
      await audit({ action: "create", entityType: "department", entityId: created.id, description: `Created department ${parsed.data.code}` });
    }
  } catch (e: any) {
    if (e?.code === "P2002") return { fieldErrors: { code: "That code is already in use." } };
    return { error: "Could not save the department." };
  }
  revalidatePath("/admin/departments");
  return { ok: true };
}

export async function deleteDepartment(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("id"));
  try {
    await prisma.department.delete({ where: { id } });
    await audit({ action: "delete", entityType: "department", entityId: id, description: `Deleted department #${id}` });
  } catch {
    // Likely still referenced by courses/lecturers — leave it in place.
  }
  revalidatePath("/admin/departments");
}
