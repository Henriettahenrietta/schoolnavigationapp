"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { audit } from "@/lib/audit";

export async function cancelRequest(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "lecturer") return;
  const id = Number(formData.get("id"));
  const alloc = await prisma.allocation.findUnique({ where: { id } });
  if (alloc && alloc.lecturerId === user.id && alloc.status === "pending") {
    await prisma.allocation.update({ where: { id }, data: { status: "cancelled" } });
    await audit({ userId: user.id, action: "cancel", entityType: "allocation", entityId: id, description: "Lecturer cancelled a pending request" });
  }
  revalidatePath("/lecturer/requests");
}
