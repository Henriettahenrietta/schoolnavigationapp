"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { checkAllocation } from "@/lib/conflict/checker";
import { overlaps } from "@/lib/time";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

function revalidate() {
  revalidatePath("/admin/requests");
  revalidatePath("/admin/timetable");
}

/** Approve a pending request — but only if it is still conflict-free. */
export async function approveRequest(formData: FormData) {
  const admin = await assertAdmin();
  const id = Number(formData.get("id"));
  const alloc = await prisma.allocation.findUnique({ where: { id }, include: { course: true } });
  if (!alloc || alloc.status !== "pending") return;

  const result = await checkAllocation({
    sessionId: alloc.sessionId,
    courseId: alloc.courseId,
    lecturerId: alloc.lecturerId,
    venueId: alloc.venueId,
    dayOfWeek: alloc.dayOfWeek,
    startTime: alloc.startTime,
    endTime: alloc.endTime,
    excludeAllocationId: alloc.id,
  });
  if (!result.ok) {
    // Cannot cleanly approve — admin must override instead.
    await prisma.allocation.update({
      where: { id },
      data: { declineReason: `Blocked on approval: ${result.conflicts[0]?.message ?? "conflict"}` },
    });
    revalidate();
    return;
  }

  await prisma.allocation.update({
    where: { id },
    data: { status: "approved", approvedById: admin.id, approvedAt: new Date(), declineReason: null },
  });
  await audit({ userId: admin.id, action: "approve", entityType: "allocation", entityId: id, description: `Approved ${alloc.course.code}` });
  await notify({
    userId: alloc.lecturerId,
    title: "Allocation approved",
    message: `Your request for ${alloc.course.code} on ${alloc.dayOfWeek.toUpperCase()} ${alloc.startTime}–${alloc.endTime} was approved.`,
    link: "/lecturer/requests",
  });
  revalidate();
}

/** Reject a pending request with a reason. */
export async function rejectRequest(formData: FormData) {
  const admin = await assertAdmin();
  const id = Number(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim() || "No reason given";
  const alloc = await prisma.allocation.findUnique({ where: { id }, include: { course: true } });
  if (!alloc || alloc.status !== "pending") return;

  await prisma.allocation.update({ where: { id }, data: { status: "declined", declineReason: reason } });
  await audit({ userId: admin.id, action: "reject", entityType: "allocation", entityId: id, description: `Rejected ${alloc.course.code}: ${reason}` });
  await notify({
    userId: alloc.lecturerId,
    title: "Allocation rejected",
    message: `Your request for ${alloc.course.code} was rejected: ${reason}`,
    link: "/lecturer/requests",
  });
  revalidate();
}

/**
 * Force-override: approve this request even though it clashes, and bump any APPROVED
 * allocation it conflicts with (class/lecturer/venue) to declined, notifying that lecturer.
 * Every override is logged with the admin's justification.
 */
export async function overrideRequest(formData: FormData) {
  const admin = await assertAdmin();
  const id = Number(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim() || "Administrative override";
  const alloc = await prisma.allocation.findUnique({ where: { id }, include: { course: true } });
  if (!alloc || alloc.status !== "pending") return;

  await prisma.$transaction(async (tx) => {
    // Find approved allocations that clash on the same day/time.
    const sameDay = await tx.allocation.findMany({
      where: { sessionId: alloc.sessionId, status: "approved", dayOfWeek: alloc.dayOfWeek, id: { not: alloc.id } },
      include: { course: true },
    });
    const clashing = sameDay.filter(
      (e) =>
        overlaps(alloc.startTime, alloc.endTime, e.startTime, e.endTime) &&
        (e.venueId === alloc.venueId ||
          e.lecturerId === alloc.lecturerId ||
          (e.course.departmentId === alloc.course.departmentId && e.course.level === alloc.course.level)),
    );

    for (const c of clashing) {
      await tx.allocation.update({
        where: { id: c.id },
        data: { status: "declined", declineReason: `Overridden by admin: ${reason}` },
      });
      await tx.notification.create({
        data: {
          userId: c.lecturerId,
          title: "Allocation overridden",
          message: `Your approved ${c.course.code} slot on ${c.dayOfWeek.toUpperCase()} ${c.startTime}–${c.endTime} was overridden: ${reason}`,
          link: "/lecturer/requests",
        },
      });
    }

    await tx.allocation.update({
      where: { id },
      data: {
        status: "approved",
        approvedById: admin.id,
        approvedAt: new Date(),
        isOverride: true,
        overrideReason: reason,
        declineReason: null,
      },
    });
  });

  await audit({ userId: admin.id, action: "override", entityType: "allocation", entityId: id, description: `Override-approved ${alloc.course.code}: ${reason}` });
  await notify({
    userId: alloc.lecturerId,
    title: "Allocation approved (override)",
    message: `Your request for ${alloc.course.code} was approved via override.`,
    link: "/lecturer/requests",
  });
  revalidate();
}
