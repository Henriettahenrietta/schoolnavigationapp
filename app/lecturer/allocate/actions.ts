"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { allocationRequestSchema } from "@/lib/validation";
import { checkAllocation } from "@/lib/conflict/checker";
import { audit } from "@/lib/audit";
import type { Conflict, FreeSlot } from "@/lib/conflict/core";

export type AllocateState = {
  ok?: boolean;
  declined?: boolean;
  message?: string;
  error?: string;
  conflicts?: Conflict[];
  suggestions?: FreeSlot[];
  allocated?: { code: string; day: string; start: string; end: string; venue: string };
};

/**
 * Instant self-service allocation:
 *  - if the course is not yet allocated AND the slot is free  -> ALLOCATE (approved) immediately
 *  - if the course is already allocated                        -> DECLINE
 *  - if the slot clashes                                       -> DECLINE with reasons + free slots
 */
export async function instantAllocate(
  _prev: AllocateState,
  formData: FormData,
): Promise<AllocateState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "lecturer") return { error: "Unauthorized." };

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) return { error: "There is no active session." };

  const parsed = allocationRequestSchema.safeParse({
    sessionId: session.id,
    courseId: formData.get("courseId"),
    lecturerId: user.id,
    venueId: formData.get("venueId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please complete every field." };
  const request = parsed.data;

  const course = await prisma.course.findUnique({ where: { id: request.courseId } });
  if (!course) return { error: "Course not found." };

  // Rule: a course that already has an allocation is declined.
  const already = await prisma.allocation.findFirst({
    where: { sessionId: session.id, courseId: request.courseId, status: { in: ["approved", "pending"] } },
  });
  if (already) {
    return { declined: true, message: `${course.code} has already been allocated. It cannot be allocated again.` };
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      const result = await checkAllocation(request, tx);
      if (!result.ok) {
        const err: any = new Error("conflict");
        err.result = result;
        throw err;
      }
      return tx.allocation.create({
        data: {
          sessionId: request.sessionId,
          courseId: request.courseId,
          lecturerId: user.id,
          venueId: request.venueId,
          dayOfWeek: request.dayOfWeek,
          startTime: request.startTime,
          endTime: request.endTime,
          status: "approved", // instant self-service allocation
          source: "manual",
          approvedById: user.id,
          approvedAt: new Date(),
        },
      });
    });

    const venue = await prisma.venue.findUnique({ where: { id: created.venueId } });
    await audit({
      userId: user.id,
      action: "self_allocate",
      entityType: "allocation",
      entityId: created.id,
      description: `Instant self-allocation of ${course.code} on ${request.dayOfWeek} ${request.startTime}-${request.endTime}`,
    });
    revalidatePath("/lecturer/timetable");
    revalidatePath("/admin/timetable");
    return {
      ok: true,
      message: `${course.code} allocated successfully.`,
      allocated: { code: course.code, day: request.dayOfWeek, start: request.startTime, end: request.endTime, venue: venue?.name ?? "" },
    };
  } catch (e: any) {
    if (e?.result) {
      return { declined: true, message: "That slot clashes — see the details.", conflicts: e.result.conflicts, suggestions: e.result.suggestions };
    }
    return { error: "Could not allocate. Please try again." };
  }
}
