import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { EntityManager, type CrudColumn, type CrudField } from "@/components/crud/entity-manager";
import { saveSession, deleteSession } from "./actions";

function ymd(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export default async function SessionsPage() {
  await requireRole("admin");
  const sessions = await prisma.session.findMany({
    orderBy: [{ isActive: "desc" }, { name: "desc" }],
    include: { _count: { select: { courses: true } } },
  });

  const rows = sessions.map((s) => ({
    id: s.id,
    name: s.name,
    semester: s.semester,
    semesterLabel: s.semester === "first" ? "First" : "Second",
    activeLabel: s.isActive ? "● Active" : "—",
    isActive: s.isActive,
    courses: s._count.courses,
    startDate: ymd(s.startDate),
    endDate: ymd(s.endDate),
  }));

  const columns: CrudColumn[] = [
    { key: "name", label: "Session" },
    { key: "semesterLabel", label: "Semester" },
    { key: "activeLabel", label: "Status" },
    { key: "courses", label: "Courses" },
  ];

  const fields: CrudField[] = [
    { name: "name", label: "Session name", type: "text", required: true, placeholder: "2025/2026" },
    {
      name: "semester",
      label: "Semester",
      type: "select",
      required: true,
      options: [
        { value: "first", label: "First" },
        { value: "second", label: "Second" },
      ],
    },
    { name: "startDate", label: "Start date", type: "date" },
    { name: "endDate", label: "End date", type: "date" },
    { name: "isActive", label: "Active session", type: "checkbox", placeholder: "Make this the active session", fullWidth: true },
  ];

  return (
    <EntityManager
      title="Academic sessions"
      subtitle="Only one session is active at a time. Activating a session deactivates the others."
      resource="Session"
      columns={columns}
      fields={fields}
      rows={rows}
      saveAction={saveSession}
      deleteAction={deleteSession}
    />
  );
}
