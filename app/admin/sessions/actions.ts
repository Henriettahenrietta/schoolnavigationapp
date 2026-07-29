"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { SEMESTERS } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { type ActionState, zodFieldErrors } from "@/lib/crud";

const schema = z.object({
  name: z.string().min(4).max(20),
  semester: z.enum(SEMESTERS),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isActive: z.coerce.boolean().optional().default(false),
});

export async function saveSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertAdmin();
  const idRaw = formData.get("id");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    semester: formData.get("semester"),
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    isActive: formData.get("isActive") === "true",
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const data = parsed.data;

  try {
    // Only one session may be active at a time.
    if (data.isActive) {
      await prisma.session.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    if (idRaw) {
      const id = Number(idRaw);
      await prisma.session.update({ where: { id }, data });
      await audit({ action: "update", entityType: "session", entityId: id, description: `Updated session ${data.name}` });
    } else {
      const s = await prisma.session.create({ data });
      await audit({ action: "create", entityType: "session", entityId: s.id, description: `Created session ${data.name}` });
    }
  } catch (e: any) {
    if (e?.code === "P2002") return { error: "A session with that name and semester already exists." };
    return { error: "Could not save the session." };
  }
  revalidatePath("/admin/sessions");
  return { ok: true };
}

export async function deleteSession(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("id"));
  try {
    await prisma.session.delete({ where: { id } });
    await audit({ action: "delete", entityType: "session", entityId: id, description: `Deleted session #${id}` });
  } catch {
    // Referenced by courses/allocations — keep it.
  }
  revalidatePath("/admin/sessions");
}
