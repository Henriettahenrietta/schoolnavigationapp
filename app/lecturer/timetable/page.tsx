import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { loadSettings } from "@/lib/conflict/checker";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui";
import { TimetableGrid, type GridAllocation } from "@/components/timetable-grid";

export default async function MyTimetablePage() {
  const user = await requireRole("lecturer");
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  const settings = await loadSettings();

  const allocations = session
    ? await prisma.allocation.findMany({
        where: { sessionId: session.id, lecturerId: user.id, status: "approved" },
        include: { course: true, venue: true },
      })
    : [];

  const grid: GridAllocation[] = allocations.map((a) => ({
    id: a.id,
    courseCode: a.course.code,
    courseTitle: a.course.title,
    venueName: a.venue.name,
    departmentId: a.course.departmentId,
    dayOfWeek: a.dayOfWeek,
    startTime: a.startTime,
    endTime: a.endTime,
  }));

  return (
    <div>
      <PageHeader
        title="My timetable"
        subtitle={session ? `Approved classes for ${session.name} (${session.semester}).` : "No active session."}
      />
      {grid.length === 0 ? (
        <Alert variant="info">You have no approved classes yet.</Alert>
      ) : (
        <TimetableGrid
          allocations={grid}
          dayStart={settings.dayStartTime}
          dayEnd={settings.dayEndTime}
          slotMinutes={settings.slotDurationMinutes}
          days={settings.workingDays}
          showLecturer={false}
        />
      )}
    </div>
  );
}
