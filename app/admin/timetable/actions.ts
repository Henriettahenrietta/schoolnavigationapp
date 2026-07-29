"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { audit } from "@/lib/audit";

export async function togglePublish(formData: FormData) {
  const admin = await assertAdmin();
  const sessionId = Number(formData.get("sessionId"));
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return;
  const next = !session.isPublished;
  await prisma.session.update({ where: { id: sessionId }, data: { isPublished: next } });
  await audit({
    userId: admin.id,
    action: next ? "publish" : "unpublish",
    entityType: "session",
    entityId: sessionId,
    description: `${next ? "Published" : "Unpublished"} timetable for ${session.name}`,
  });
  revalidatePath("/admin/timetable");
  revalidatePath("/timetable");
}
