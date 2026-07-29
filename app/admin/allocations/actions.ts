"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { allocationRequestSchema } from "@/lib/validation";
import { checkAllocation } from "@/lib/conflict/checker";
import { audit } from "@/lib/audit";
import type { Conflict, FreeSlot } from "@/lib/conflict/core";

export type AllocState = {
  ok?: boolean;
  error?: string;
  conflicts?: Conflict[];
  suggestions?: FreeSlot[];
};

function revalidate() {
  revalidatePath("/admin/allocations");
  revalidatePath("/admin/timetable");
  revalidatePath("/lecturer/timetable");
}

/**
 * Admin add/edit a class directly on the timetable — conflict-checked. Editing lets an
 * admin replace the lecturer (e.g. someone who is no longer available), move the time or
 * change the venue. Every change re-runs the AllocationConflictChecker.
 */
export async function saveAllocation(_prev: AllocState, formData: FormData): Promise<AllocState> {
  const admin = await assertAdmin();
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) return { error: "There is no active session." };

  const idRaw = formData.get("id");
  const parsed = allocationRequestSchema.safeParse({
    sessionId: session.id,
    courseId: formData.get("courseId"),
    lecturerId: formData.get("lecturerId"),
    venueId: formData.get("venueId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please complete every field." };
  const request = { ...parsed.data, excludeAllocationId: idRaw ? Number(idRaw) : undefined };

  try {
    await prisma.$transaction(async (tx) => {
      const result = await checkAllocation(request, tx);
      if (!result.ok) {
        const err: any = new Error("conflict");
        err.result = result;
        throw err;
      }
      if (idRaw) {
        await tx.allocation.update({
          where: { id: Number(idRaw) },
          data: {
            courseId: request.courseId, lecturerId: request.lecturerId, venueId: request.venueId,
            dayOfWeek: request.dayOfWeek, startTime: request.startTime, endTime: request.endTime,
            status: "approved", approvedById: admin.id, approvedAt: new Date(), declineReason: null,
          },
        });
      } else {
        await tx.allocation.create({
          data: {
            sessionId: session.id, courseId: request.courseId, lecturerId: request.lecturerId, venueId: request.venueId,
            dayOfWeek: request.dayOfWeek, startTime: request.startTime, endTime: request.endTime,
            status: "approved", source: "manual", approvedById: admin.id, approvedAt: new Date(),
          },
        });
      }
    });
  } catch (e: any) {
    if (e?.result) return { error: "This slot clashes — see below.", conflicts: e.result.conflicts, suggestions: e.result.suggestions };
    return { error: "Could not save the class." };
  }

  await audit({
    userId: admin.id,
    action: idRaw ? "update" : "create",
    entityType: "allocation",
    entityId: idRaw ? Number(idRaw) : undefined,
    description: idRaw ? "Admin edited a class" : "Admin added a class",
  });
  revalidate();
  return { ok: true };
}

export async function deleteAllocation(formData: FormData) {
  const admin = await assertAdmin();
  const id = Number(formData.get("id"));
  await prisma.allocation.delete({ where: { id } }).catch(() => {});
  await audit({ userId: admin.id, action: "delete", entityType: "allocation", entityId: id, description: "Admin removed a class" });
  revalidate();
}
