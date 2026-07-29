"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { programmeSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { type ActionState, zodFieldErrors } from "@/lib/crud";

export async function saveProgramme(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertAdmin();
  const idRaw = formData.get("id");
  const parsed = programmeSchema.safeParse({
    departmentId: formData.get("departmentId"),
    name: formData.get("name"),
    level: formData.get("level"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    if (idRaw) {
      const id = Number(idRaw);
      await prisma.programme.update({ where: { id }, data: parsed.data });
      await audit({ action: "update", entityType: "programme", entityId: id, description: `Updated programme ${parsed.data.name}` });
    } else {
      const p = await prisma.programme.create({ data: parsed.data });
      await audit({ action: "create", entityType: "programme", entityId: p.id, description: `Created programme ${parsed.data.name}` });
    }
  } catch {
    return { error: "Could not save the programme." };
  }
  revalidatePath("/admin/programmes");
  return { ok: true };
}

export async function deleteProgramme(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("id"));
  try {
    await prisma.programme.delete({ where: { id } });
    await audit({ action: "delete", entityType: "programme", entityId: id, description: `Deleted programme #${id}` });
  } catch {
    // ignore
  }
  revalidatePath("/admin/programmes");
}
