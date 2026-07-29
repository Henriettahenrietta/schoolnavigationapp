import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { EntityManager, type CrudColumn, type CrudField } from "@/components/crud/entity-manager";
import { saveAvailability, deleteAvailability } from "./actions";
import { DAYS, DAY_LABELS } from "@/lib/constants";

export default async function AvailabilityPage() {
  const user = await requireRole("lecturer");
  const rows = await prisma.lecturerAvailability.findMany({
    where: { lecturerId: user.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const data = rows.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    dayLabel: DAY_LABELS[r.dayOfWeek as keyof typeof DAY_LABELS] ?? r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    preference: r.preference,
    preferenceLabel: r.preference === "preferred" ? "Preferred" : "Unavailable",
  }));

  const columns: CrudColumn[] = [
    { key: "dayLabel", label: "Day" },
    { key: "startTime", label: "From" },
    { key: "endTime", label: "To" },
    { key: "preferenceLabel", label: "Preference" },
  ];

  const fields: CrudField[] = [
    { name: "dayOfWeek", label: "Day", type: "select", required: true, options: DAYS.map((d) => ({ value: d, label: DAY_LABELS[d] })) },
    { name: "startTime", label: "From", type: "time", required: true },
    { name: "endTime", label: "To", type: "time", required: true },
    {
      name: "preference",
      label: "Preference",
      type: "select",
      required: true,
      options: [
        { value: "preferred", label: "Preferred (available)" },
        { value: "unavailable", label: "Unavailable" },
      ],
    },
  ];

  return (
    <EntityManager
      title="My availability"
      subtitle="Declare when you prefer to teach and when you're unavailable. The generator honours these."
      resource="Availability"
      columns={columns}
      fields={fields}
      rows={data}
      saveAction={saveAvailability}
      deleteAction={deleteAvailability}
    />
  );
}
