"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { allocationRequestSchema } from "@/lib/validation";
import { checkAllocation } from "@/lib/conflict/checker";
import { audit } from "@/lib/audit";
import type { Conflict, FreeSlot } from "@/lib/conflict/core";

export type SubmitState = {
  error?: string;
  conflicts?: Conflict[];
  suggestions?: FreeSlot[];
};

export async function submitAllocationRequest(
  _prev: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const user = await getCurrentUser();
  if (!user || user.role !== "lecturer") return { error: "Unauthorized." };

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) return { error: "There is no active session to request against." };

  const parsed = allocationRequestSchema.safeParse({
    sessionId: session.id,
    courseId: formData.get("courseId"),
    lecturerId: user.id,
    venueId: formData.get("venueId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please complete every field." };
  }
  const request = parsed.data;

  try {
    // Re-run the SAME checker inside a transaction so two simultaneous submissions for the
    // same slot cannot both succeed (the second sees the first and is rejected).
    await prisma.$transaction(async (tx) => {
      const result = await checkAllocation(request, tx);
      if (!result.ok) {
        const err: any = new Error("conflict");
        err.result = result;
        throw err;
      }
      await tx.allocation.create({
        data: {
          sessionId: request.sessionId,
          courseId: request.courseId,
          lecturerId: user.id,
          venueId: request.venueId,
          dayOfWeek: request.dayOfWeek,
          startTime: request.startTime,
          endTime: request.endTime,
          status: "pending",
          source: "manual",
        },
      });
    });
  } catch (e: any) {
    if (e?.result) {
      return {
        error: "This slot clashes — see the details below.",
        conflicts: e.result.conflicts,
        suggestions: e.result.suggestions,
      };
    }
    return { error: "Could not submit the request. Please try again." };
  }

  await audit({
    userId: user.id,
    action: "request",
    entityType: "allocation",
    description: `Lecturer requested course #${request.courseId} on ${request.dayOfWeek} ${request.startTime}-${request.endTime}`,
  });
  revalidatePath("/lecturer/requests");
  revalidatePath("/admin/requests");
  redirect("/lecturer/requests?submitted=1");
}
