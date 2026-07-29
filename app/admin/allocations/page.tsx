import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { Alert } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { AllocationsManager, type AllocRow } from "./allocations-manager";

export default async function AdminAllocationsPage() {
  await requireRole("admin");
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) {
    return (
      <div>
        <PageHeader title="Manage classes" />
        <Alert variant="warning" title="No active session">Activate a session first.</Alert>
      </div>
    );
  }

  const [allocations, courses, lecturers, venues] = await Promise.all([
    prisma.allocation.findMany({
      where: { sessionId: session.id, status: { in: ["approved", "pending"] } },
      include: { course: true, lecturer: { select: { name: true } }, venue: { select: { name: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.course.findMany({ where: { sessionId: session.id }, include: { department: true }, orderBy: [{ departmentId: "asc" }, { code: "asc" }] }),
    prisma.user.findMany({ where: { role: "lecturer" }, include: { department: true }, orderBy: { name: "asc" } }),
    prisma.venue.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows: AllocRow[] = allocations.map((a) => ({
    id: a.id,
    courseId: a.courseId, courseCode: a.course.code, courseTitle: a.course.title,
    lecturerId: a.lecturerId, lecturerName: a.lecturer.name,
    venueId: a.venueId, venueName: a.venue.name,
    dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime,
  }));

  return (
    <AllocationsManager
      rows={rows}
      courses={courses.map((c) => ({ id: c.id, code: c.code, title: c.title, departmentName: c.department.code }))}
      lecturers={lecturers.map((l) => ({ id: l.id, name: l.name, departmentName: l.department?.code ?? "—" }))}
      venues={venues.map((v) => ({ id: v.id, name: v.name, capacity: v.capacity }))}
    />
  );
}
