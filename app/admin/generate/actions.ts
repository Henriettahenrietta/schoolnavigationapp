"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { runGeneration } from "@/lib/generator/generator";
import { audit } from "@/lib/audit";

function revalidate() {
  revalidatePath("/admin/generate");
  revalidatePath("/admin/timetable");
}

export async function generateAction(formData: FormData) {
  const admin = await assertAdmin();
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) return;
  const mode = (formData.get("mode") === "full" ? "full" : "fill") as "fill" | "full";
  const seedRaw = formData.get("seed");
  const seed = seedRaw ? Number(seedRaw) : undefined;

  const report = await runGeneration(session.id, { mode, seed: Number.isFinite(seed) ? seed : undefined, runById: admin.id });
  await audit({
    userId: admin.id, action: "generate", entityType: "generation_run", entityId: report.runId,
    description: `Generated timetable (${mode}): ${report.coursesPlaced}/${report.coursesTotal} placed, ${report.selfAuditConflicts} conflicts`,
  });
  revalidate();
  redirect("/admin/generate");
}

export async function acceptRun(formData: FormData) {
  const admin = await assertAdmin();
  const runId = Number(formData.get("runId"));
  const run = await prisma.generationRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "draft") return;

  await prisma.$transaction(async (tx) => {
    if (run.mode === "full") {
      // Rebuild-from-scratch: clear non-locked allocations not belonging to this run.
      await tx.allocation.deleteMany({
        where: { sessionId: run.sessionId, isLocked: false, generationRunId: { not: run.id }, status: { in: ["approved", "pending", "draft"] } },
      });
    }
    await tx.allocation.updateMany({
      where: { generationRunId: run.id, status: "draft" },
      data: { status: "approved", approvedById: admin.id, approvedAt: new Date() },
    });
    await tx.generationRun.update({ where: { id: run.id }, data: { status: "accepted" } });
  });
  await audit({ userId: admin.id, action: "accept", entityType: "generation_run", entityId: runId, description: `Accepted generated timetable run #${runId}` });
  revalidate();
  redirect("/admin/generate");
}

export async function discardRun(formData: FormData) {
  const admin = await assertAdmin();
  const runId = Number(formData.get("runId"));
  const run = await prisma.generationRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "draft") return;
  await prisma.$transaction(async (tx) => {
    await tx.allocation.deleteMany({ where: { generationRunId: run.id, status: "draft" } });
    await tx.generationRun.update({ where: { id: run.id }, data: { status: "discarded" } });
  });
  await audit({ userId: admin.id, action: "discard", entityType: "generation_run", entityId: runId, description: `Discarded run #${runId}` });
  revalidate();
  redirect("/admin/generate");
}

export async function rollbackRun(formData: FormData) {
  const admin = await assertAdmin();
  const runId = Number(formData.get("runId"));
  const run = await prisma.generationRun.findUnique({ where: { id: runId } });
  if (!run || run.status !== "accepted") return;
  await prisma.$transaction(async (tx) => {
    // Remove the generated (now approved) allocations from this run, restoring prior state.
    await tx.allocation.deleteMany({ where: { generationRunId: run.id } });
    await tx.generationRun.update({ where: { id: run.id }, data: { status: "rolled_back" } });
  });
  await audit({ userId: admin.id, action: "rollback", entityType: "generation_run", entityId: runId, description: `Rolled back run #${runId}` });
  revalidate();
  redirect("/admin/generate");
}
