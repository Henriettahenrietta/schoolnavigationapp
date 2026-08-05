"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertHod } from "@/lib/auth/current-user";
import { runGeneration } from "@/lib/generator/generator";
import { audit } from "@/lib/audit";

function revalidate() {
  revalidatePath("/hod/generate");
  revalidatePath("/hod/timetable");
  revalidatePath("/hod/allocations");
  revalidatePath("/hod");
  revalidatePath("/admin/timetable");
}

/** Load a run and confirm it was this Head's own departmental run. */
async function loadOwnRun(runId: number, departmentId: number, status: string) {
  const run = await prisma.generationRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== status) return null;
  if (run.departmentId !== departmentId) return null;
  return run;
}

/**
 * Regenerate the timetable for this Head's department only. Other departments' classes
 * are passed to the generator as immovable constraints, so a departmental rebuild can
 * still never double-book a shared venue or a lecturer who teaches elsewhere.
 */
export async function generateForDepartment(formData: FormData) {
  const { user, departmentId } = await assertHod();
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) return;

  const mode = (formData.get("mode") === "full" ? "full" : "fill") as "fill" | "full";
  const seedRaw = formData.get("seed");
  const seed = seedRaw ? Number(seedRaw) : undefined;

  const report = await runGeneration(session.id, {
    mode,
    seed: Number.isFinite(seed) ? seed : undefined,
    runById: user.id,
    departmentId,
  });
  await audit({
    userId: user.id,
    action: "generate",
    entityType: "generation_run",
    entityId: report.runId,
    description: `HOD generated department timetable (${mode}): ${report.coursesPlaced}/${report.coursesTotal} placed, ${report.selfAuditConflicts} conflicts`,
  });
  revalidate();
  redirect("/hod/generate");
}

export async function acceptDepartmentRun(formData: FormData) {
  const { user, departmentId } = await assertHod();
  const runId = Number(formData.get("runId"));
  const run = await loadOwnRun(runId, departmentId, "draft");
  if (!run) return;

  await prisma.$transaction(async (tx) => {
    if (run.mode === "full") {
      // Clear this department's non-locked classes only. The admin's equivalent wipes the
      // whole session; a Head must never touch another department's timetable.
      // The OR is load-bearing: `{ not: run.id }` alone silently keeps manually created
      // rows, whose generationRunId is NULL, because SQL `NULL <> id` is not true.
      await tx.allocation.deleteMany({
        where: {
          sessionId: run.sessionId,
          isLocked: false,
          status: { in: ["approved", "pending", "draft"] },
          course: { departmentId },
          OR: [{ generationRunId: null }, { generationRunId: { not: run.id } }],
        },
      });
    }
    await tx.allocation.updateMany({
      where: { generationRunId: run.id, status: "draft" },
      data: { status: "approved", approvedById: user.id, approvedAt: new Date() },
    });
    await tx.generationRun.update({ where: { id: run.id }, data: { status: "accepted" } });
  });

  await audit({
    userId: user.id, action: "accept", entityType: "generation_run", entityId: runId,
    description: `HOD accepted department run #${runId}`,
  });
  revalidate();
  redirect("/hod/generate");
}

export async function discardDepartmentRun(formData: FormData) {
  const { user, departmentId } = await assertHod();
  const runId = Number(formData.get("runId"));
  const run = await loadOwnRun(runId, departmentId, "draft");
  if (!run) return;

  await prisma.$transaction(async (tx) => {
    await tx.allocation.deleteMany({ where: { generationRunId: run.id, status: "draft" } });
    await tx.generationRun.update({ where: { id: run.id }, data: { status: "discarded" } });
  });
  await audit({
    userId: user.id, action: "discard", entityType: "generation_run", entityId: runId,
    description: `HOD discarded department run #${runId}`,
  });
  revalidate();
  redirect("/hod/generate");
}

export async function rollbackDepartmentRun(formData: FormData) {
  const { user, departmentId } = await assertHod();
  const runId = Number(formData.get("runId"));
  const run = await loadOwnRun(runId, departmentId, "accepted");
  if (!run) return;

  await prisma.$transaction(async (tx) => {
    await tx.allocation.deleteMany({ where: { generationRunId: run.id } });
    await tx.generationRun.update({ where: { id: run.id }, data: { status: "rolled_back" } });
  });
  await audit({
    userId: user.id, action: "rollback", entityType: "generation_run", entityId: runId,
    description: `HOD rolled back department run #${runId}`,
  });
  revalidate();
  redirect("/hod/generate");
}
