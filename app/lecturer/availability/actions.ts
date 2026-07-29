"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { availabilitySchema } from "@/lib/validation";
import { type ActionState, zodFieldErrors } from "@/lib/crud";

export async function saveAvailability(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "lecturer") return { error: "Unauthorized." };
  const idRaw = formData.get("id");
  const parsed = availabilitySchema.safeParse({
    lecturerId: user.id, // forced — a lecturer edits only their own availability
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    preference: formData.get("preference"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };

  try {
    if (idRaw) {
      const id = Number(idRaw);
      const owned = await prisma.lecturerAvailability.findUnique({ where: { id } });
      if (!owned || owned.lecturerId !== user.id) return { error: "Not found." };
      await prisma.lecturerAvailability.update({ where: { id }, data: parsed.data });
    } else {
      await prisma.lecturerAvailability.create({ data: parsed.data });
    }
  } catch {
    return { error: "Could not save availability." };
  }
  revalidatePath("/lecturer/availability");
  return { ok: true };
}

export async function deleteAvailability(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "lecturer") return;
  const id = Number(formData.get("id"));
  const owned = await prisma.lecturerAvailability.findUnique({ where: { id } });
  if (owned && owned.lecturerId === user.id) {
    await prisma.lecturerAvailability.delete({ where: { id } });
  }
  revalidatePath("/lecturer/availability");
}
