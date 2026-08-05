"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertHod } from "@/lib/auth/current-user";
import { allocationRequestSchema } from "@/lib/validation";
import { checkAllocation } from "@/lib/conflict/checker";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";
import type { Conflict, FreeSlot } from "@/lib/conflict/core";

export type HodAllocState = {
  ok?: boolean;
  error?: string;
  conflicts?: Conflict[];
  suggestions?: FreeSlot[];
};

function revalidate() {
  revalidatePath("/hod/allocations");
  revalidatePath("/hod/timetable");
  revalidatePath("/hod");
  revalidatePath("/admin/timetable");
  revalidatePath("/lecturer/timetable");
}

/**
 * A HOD adds or edits a class in their own department, most often to replace the
 * lecturer teaching it. The department check is on the COURSE, not on the lecturer:
 * lecturers may teach across departments, so a Head is allowed to assign an outside
 * lecturer to their own course, but never to touch another department's course.
 */
export async function saveHodAllocation(
  _prev: HodAllocState,
  formData: FormData,
): Promise<HodAllocState> {
  const { user, departmentId } = await assertHod();
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
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please complete every field." };
  }
  const request = { ...parsed.data, excludeAllocationId: idRaw ? Number(idRaw) : undefined };

  // The target course must belong to this Head's department.
  const course = await prisma.course.findUnique({ where: { id: request.courseId } });
  if (!course || course.departmentId !== departmentId) {
    return { error: "That course is not in your department." };
  }

  // When editing, the row being edited must also be one of ours.
  if (idRaw) {
    const existing = await prisma.allocation.findUnique({
      where: { id: Number(idRaw) },
      include: { course: true },
    });
    if (!existing || existing.course.departmentId !== departmentId) {
      return { error: "That class is not in your department." };
    }
  }

  const previousLecturerId = idRaw
    ? (await prisma.allocation.findUnique({ where: { id: Number(idRaw) } }))?.lecturerId
    : undefined;

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
            status: "approved", approvedById: user.id, approvedAt: new Date(), declineReason: null,
          },
        });
      } else {
        await tx.allocation.create({
          data: {
            sessionId: session.id, courseId: request.courseId, lecturerId: request.lecturerId,
            venueId: request.venueId, dayOfWeek: request.dayOfWeek,
            startTime: request.startTime, endTime: request.endTime,
            status: "approved", source: "manual", approvedById: user.id, approvedAt: new Date(),
          },
        });
      }
    });
  } catch (e: any) {
    if (e?.result) {
      return {
        error: "This slot clashes. See below.",
        conflicts: e.result.conflicts,
        suggestions: e.result.suggestions,
      };
    }
    return { error: "Could not save the class." };
  }

  // A lecturer swap is the headline HOD action, so tell both people it happened.
  if (previousLecturerId && previousLecturerId !== request.lecturerId) {
    await notify({
      userId: previousLecturerId,
      title: "You were removed from a class",
      message: `${course.code} (${course.title}) was reassigned by your Head of Department.`,
      link: "/lecturer/timetable",
    });
    await notify({
      userId: request.lecturerId,
      title: "You were assigned a class",
      message: `You now teach ${course.code} (${course.title}) on ${request.dayOfWeek.toUpperCase()} ${request.startTime}-${request.endTime}.`,
      link: "/lecturer/timetable",
    });
  }

  await audit({
    userId: user.id,
    action: idRaw ? "update" : "create",
    entityType: "allocation",
    entityId: idRaw ? Number(idRaw) : undefined,
    description: idRaw
      ? `HOD edited ${course.code}${previousLecturerId !== request.lecturerId ? " (lecturer replaced)" : ""}`
      : `HOD added a class for ${course.code}`,
  });
  revalidate();
  return { ok: true };
}

export async function deleteHodAllocation(formData: FormData) {
  const { user, departmentId } = await assertHod();
  const id = Number(formData.get("id"));

  const existing = await prisma.allocation.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!existing || existing.course.departmentId !== departmentId) return;

  await prisma.allocation.delete({ where: { id } }).catch(() => {});
  await audit({
    userId: user.id,
    action: "delete",
    entityType: "allocation",
    entityId: id,
    description: `HOD removed a class for ${existing.course.code}`,
  });
  revalidate();
}
