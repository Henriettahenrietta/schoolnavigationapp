"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/current-user";
import { settingsSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { type ActionState, zodFieldErrors } from "@/lib/crud";

export async function updateSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await assertAdmin();
  const parsed = settingsSchema.safeParse({
    dayStartTime: formData.get("dayStartTime"),
    dayEndTime: formData.get("dayEndTime"),
    slotDurationMinutes: formData.get("slotDurationMinutes"),
    workingDays: formData.getAll("workingDays"),
    maxWeeklyHoursPerLecturer: formData.get("maxWeeklyHoursPerLecturer"),
    allowOverrides: formData.get("allowOverrides") === "true",
    lunchStart: formData.get("lunchStart"),
    lunchEnd: formData.get("lunchEnd"),
    maxConsecutiveHours: formData.get("maxConsecutiveHours"),
  });
  if (!parsed.success) return { fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;

  if (d.dayEndTime <= d.dayStartTime) {
    return { fieldErrors: { dayEndTime: "Day end must be after day start." } };
  }

  const existing = await prisma.setting.findFirst();
  const data = {
    dayStartTime: d.dayStartTime,
    dayEndTime: d.dayEndTime,
    slotDurationMinutes: d.slotDurationMinutes,
    workingDays: JSON.stringify(d.workingDays),
    maxWeeklyHoursPerLecturer: d.maxWeeklyHoursPerLecturer,
    allowOverrides: d.allowOverrides,
    lunchStart: d.lunchStart,
    lunchEnd: d.lunchEnd,
    maxConsecutiveHours: d.maxConsecutiveHours,
  };

  if (existing) await prisma.setting.update({ where: { id: existing.id }, data });
  else await prisma.setting.create({ data });

  await audit({ action: "update", entityType: "setting", description: "Updated system settings" });
  revalidatePath("/admin/settings");
  return { ok: true };
}
