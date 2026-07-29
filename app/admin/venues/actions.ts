"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { venueSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { type ActionState, zodFieldErrors } from "@/lib/crud";

export async function saveVenue(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertAdmin();
  const idRaw = formData.get("id");
  const parsed = venueSchema.safeParse({
    name: formData.get("name"),
    building: formData.get("building"),
    capacity: formData.get("capacity"),
    type: formData.get("type"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    if (idRaw) {
      const id = Number(idRaw);
      await prisma.venue.update({ where: { id }, data: parsed.data });
      await audit({ action: "update", entityType: "venue", entityId: id, description: `Updated venue ${parsed.data.name}` });
    } else {
      const v = await prisma.venue.create({ data: parsed.data });
      await audit({ action: "create", entityType: "venue", entityId: v.id, description: `Created venue ${parsed.data.name}` });
    }
  } catch (e: any) {
    if (e?.code === "P2002") return { fieldErrors: { name: "A venue with that name already exists." } };
    return { error: "Could not save the venue." };
  }
  revalidatePath("/admin/venues");
  return { ok: true };
}

export async function deleteVenue(formData: FormData) {
  await assertAdmin();
  const id = Number(formData.get("id"));
  try {
    await prisma.venue.delete({ where: { id } });
    await audit({ action: "delete", entityType: "venue", entityId: id, description: `Deleted venue #${id}` });
  } catch {
    // Referenced by allocations — keep it.
  }
  revalidatePath("/admin/venues");
}
