import { prisma } from "@/lib/prisma";
import { requireHod } from "@/lib/auth/current-user";
import { Alert } from "@/components/ui";
import { PageHeader } from "@/components/page-header";
import { NoDepartment } from "../no-department";
import { HodAllocationsManager, type HodAllocRow } from "./allocations-manager";

export const dynamic = "force-dynamic";

export default async function HodAllocationsPage() {
  const { departmentId } = await requireHod();
  if (departmentId == null) return <NoDepartment title="Department classes" />;

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) {
    return (
      <div>
        <PageHeader title="Department classes" />
        <Alert variant="warning" title="No active session">
          There is no active session. An administrator needs to activate one first.
        </Alert>
      </div>
    );
  }

  const department = await prisma.department.findUnique({ where: { id: departmentId } });

  const [allocations, courses, lecturers, venues] = await Promise.all([
    prisma.allocation.findMany({
      where: {
        sessionId: session.id,
        status: { in: ["approved", "pending"] },
        course: { departmentId },
      },
      include: { course: true, lecturer: { select: { name: true } }, venue: { select: { name: true } } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    }),
    prisma.course.findMany({
      where: { sessionId: session.id, departmentId },
      orderBy: [{ level: "asc" }, { code: "asc" }],
      select: { id: true, code: true, title: true, level: true },
    }),
    // Lecturers may teach across departments, so a Head can pull in an outside lecturer.
    // Own-department staff are listed first in the picker.
    prisma.user.findMany({
      where: { role: "lecturer", isActive: true },
      include: { department: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.venue.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, capacity: true } }),
  ]);

  const rows: HodAllocRow[] = allocations.map((a) => ({
    id: a.id,
    courseId: a.courseId, courseCode: a.course.code, courseTitle: a.course.title,
    lecturerId: a.lecturerId, lecturerName: a.lecturer.name,
    venueId: a.venueId, venueName: a.venue.name,
    dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime,
  }));

  return (
    <HodAllocationsManager
      departmentName={department?.name ?? "Your department"}
      rows={rows}
      courses={courses}
      lecturers={lecturers.map((l) => ({
        id: l.id,
        name: l.name,
        departmentName: l.department?.name ?? "Unassigned",
        isOwnDepartment: l.departmentId === departmentId,
      }))}
      venues={venues}
    />
  );
}
