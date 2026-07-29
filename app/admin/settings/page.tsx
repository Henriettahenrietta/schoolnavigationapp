import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { SettingsForm, type SettingsValues } from "./settings-form";

function parseDays(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export default async function SettingsPage() {
  await requireRole("admin");
  const s = await prisma.setting.findFirst();

  const values: SettingsValues = {
    dayStartTime: s?.dayStartTime ?? "08:00",
    dayEndTime: s?.dayEndTime ?? "18:00",
    slotDurationMinutes: s?.slotDurationMinutes ?? 60,
    workingDays: s ? parseDays(s.workingDays) : ["mon", "tue", "wed", "thu", "fri"],
    maxWeeklyHoursPerLecturer: s?.maxWeeklyHoursPerLecturer ?? 18,
    allowOverrides: s?.allowOverrides ?? true,
    lunchStart: s?.lunchStart ?? "13:00",
    lunchEnd: s?.lunchEnd ?? "14:00",
    maxConsecutiveHours: s?.maxConsecutiveHours ?? 4,
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Global scheduling rules used by the conflict engine and the timetable generator."
      />
      <SettingsForm values={values} />
    </div>
  );
}
