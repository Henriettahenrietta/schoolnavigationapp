"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertHod } from "@/lib/auth/current-user";
import { checkAllocation } from "@/lib/conflict/checker";
import { overlaps } from "@/lib/time";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notify";

function revalidate() {
  revalidatePath("/hod/requests");
  revalidatePath("/hod/timetable");
  revalidatePath("/hod");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/timetable");
}

/**
 * Load a pending request and confirm it belongs to this Head's department. Requests are
 * routed by the COURSE's department, not the requesting lecturer's, because lecturers may
 * teach across departments: whoever owns the course owns the decision.
 */
async function loadOwnRequest(id: number, departmentId: number) {
  const alloc = await prisma.allocation.findUnique({
    where: { id },
    include: { course: true },
  });
  if (!alloc || alloc.status !== "pending") return null;
  if (alloc.course.departmentId !== departmentId) return null;
  return alloc;
}

/** Approve a pending request, but only if it is still conflict-free. */
export async function approveHodRequest(formData: FormData) {
  const { user, departmentId } = await assertHod();
  const id = Number(formData.get("id"));
  const alloc = await loadOwnRequest(id, departmentId);
  if (!alloc) return;

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
    await prisma.allocation.update({
      where: { id },
      data: { declineReason: `Blocked on approval: ${result.conflicts[0]?.message ?? "conflict"}` },
    });
    revalidate();
    return;
  }

  await prisma.allocation.update({
    where: { id },
    data: { status: "approved", approvedById: user.id, approvedAt: new Date(), declineReason: null },
  });
  await audit({
    userId: user.id, action: "approve", entityType: "allocation", entityId: id,
    description: `HOD approved ${alloc.course.code}`,
  });
  await notify({
    userId: alloc.lecturerId,
    title: "Allocation approved",
    message: `Your request for ${alloc.course.code} on ${alloc.dayOfWeek.toUpperCase()} ${alloc.startTime}-${alloc.endTime} was approved by your HOD.`,
    link: "/lecturer/requests",
  });
  revalidate();
}

/** Reject a pending request with a reason. */
export async function rejectHodRequest(formData: FormData) {
  const { user, departmentId } = await assertHod();
  const id = Number(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim() || "No reason given";
  const alloc = await loadOwnRequest(id, departmentId);
  if (!alloc) return;

  await prisma.allocation.update({ where: { id }, data: { status: "declined", declineReason: reason } });
  await audit({
    userId: user.id, action: "reject", entityType: "allocation", entityId: id,
    description: `HOD rejected ${alloc.course.code}: ${reason}`,
  });
  await notify({
    userId: alloc.lecturerId,
    title: "Allocation rejected",
    message: `Your request for ${alloc.course.code} was rejected by your HOD: ${reason}`,
    link: "/lecturer/requests",
  });
  revalidate();
}

/**
 * Force-approve a clashing request and bump whatever it collides with. A Head may only
 * displace classes belonging to their OWN department: knocking out another department's
 * approved class is an administrator's call, so those clashes are left standing and
 * reported back instead.
 */
export async function overrideHodRequest(formData: FormData) {
  const { user, departmentId } = await assertHod();
  const id = Number(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").trim() || "Head of Department override";
  const alloc = await loadOwnRequest(id, departmentId);
  if (!alloc) return;

  let blockedByOtherDept = 0;

  await prisma.$transaction(async (tx) => {
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
      if (c.course.departmentId !== departmentId) {
        blockedByOtherDept++;
        continue;
      }
      await tx.allocation.update({
        where: { id: c.id },
        data: { status: "declined", declineReason: `Overridden by HOD: ${reason}` },
      });
      await tx.notification.create({
        data: {
          userId: c.lecturerId,
          title: "Allocation overridden",
          message: `Your approved ${c.course.code} slot on ${c.dayOfWeek.toUpperCase()} ${c.startTime}-${c.endTime} was overridden: ${reason}`,
          link: "/lecturer/requests",
        },
      });
    }

    await tx.allocation.update({
      where: { id },
      data: {
        status: "approved",
        approvedById: user.id,
        approvedAt: new Date(),
        isOverride: true,
        overrideReason: reason,
        declineReason: blockedByOtherDept
          ? `Approved by override, but ${blockedByOtherDept} clashing class in another department was left in place. Ask an administrator to resolve it.`
          : null,
      },
    });
  });

  await audit({
    userId: user.id, action: "override", entityType: "allocation", entityId: id,
    description: `HOD override-approved ${alloc.course.code}: ${reason}${blockedByOtherDept ? ` (${blockedByOtherDept} cross-department clash left standing)` : ""}`,
  });
  await notify({
    userId: alloc.lecturerId,
    title: "Allocation approved (override)",
    message: `Your request for ${alloc.course.code} was approved by your HOD via override.`,
    link: "/lecturer/requests",
  });
  revalidate();
}
