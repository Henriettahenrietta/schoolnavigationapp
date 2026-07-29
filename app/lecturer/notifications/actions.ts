"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function markAllRead() {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/lecturer/notifications");
}
