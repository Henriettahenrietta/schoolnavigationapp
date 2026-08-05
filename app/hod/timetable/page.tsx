import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHod } from "@/lib/auth/current-user";
import { loadSettings } from "@/lib/conflict/checker";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, Select, Button, Alert } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { PrintHeader } from "@/components/print-header";
import { TimetableGrid, type GridAllocation } from "@/components/timetable-grid";
import { DAYS, DAY_LABELS, LEVELS } from "@/lib/constants";
import { NoDepartment } from "../no-department";

export const dynamic = "force-dynamic";

export default async function HodTimetablePage({
  searchParams,
}: {
  searchParams: { level?: string; venue?: string; lecturer?: string; day?: string };
}) {
  const { departmentId } = await requireHod();
  if (departmentId == null) return <NoDepartment title="Department timetable" />;

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) {
    return (
      <div>
        <PageHeader title="Department timetable" />
        <Alert variant="warning" title="No active session">Activate a session first.</Alert>
      </div>
    );
  }

  const settings = await loadSettings();
  const department = await prisma.department.findUnique({ where: { id: departmentId } });

  const level = searchParams.level ? Number(searchParams.level) : undefined;
  const venue = searchParams.venue ? Number(searchParams.venue) : undefined;
  const lecturer = searchParams.lecturer ? Number(searchParams.lecturer) : undefined;
  const day = searchParams.day || undefined;

  const allocations = await prisma.allocation.findMany({
    where: {
      sessionId: session.id,
      status: "approved",
      // Department scope is fixed to this Head's own department and is not a filter.
      course: { departmentId, ...(level ? { level } : {}) },
      ...(venue ? { venueId: venue } : {}),
      ...(lecturer ? { lecturerId: lecturer } : {}),
      ...(day ? { dayOfWeek: day } : {}),
    },
    include: { course: true, venue: true, lecturer: { select: { name: true } } },
  });

  // Only offer filters for venues and lecturers that actually appear in this department.
  const [deptAllocs, venues] = await Promise.all([
    prisma.allocation.findMany({
      where: { sessionId: session.id, status: "approved", course: { departmentId } },
      include: { lecturer: { select: { id: true, name: true } }, venue: { select: { id: true, name: true } } },
    }),
    prisma.venue.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const lecturerOptions = Array.from(
    new Map(deptAllocs.map((a) => [a.lecturer.id, a.lecturer])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));
  const venueIdsUsed = new Set(deptAllocs.map((a) => a.venueId));
  const venueOptions = venues.filter((v) => venueIdsUsed.has(v.id));

  const grid: GridAllocation[] = allocations.map((a) => ({
    id: a.id, courseCode: a.course.code, courseTitle: a.course.title,
    lecturerName: a.lecturer.name, venueName: a.venue.name, departmentId: a.course.departmentId,
    dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime, isLocked: a.isLocked,
  }));

  const exportUrl = `/api/export/timetable?${new URLSearchParams({
    ...(searchParams as Record<string, string>),
    department: String(departmentId),
  }).toString()}`;

  return (
    <div className="space-y-5">
      <PrintHeader
        title={`${department?.name ?? "Department"} timetable`}
        session={`${session.name} · ${session.semester}`}
        generatedOn={new Date().toLocaleDateString()}
      />
      <PageHeader
        title="Department timetable"
        subtitle={`${department?.name ?? "Your department"} · ${allocations.length} class${allocations.length === 1 ? "" : "es"}`}
        action={
          <div className="no-print flex items-center gap-2">
            <Link href={exportUrl}><Button variant="secondary">Export CSV</Button></Link>
            <PrintButton />
          </div>
        }
      />

      <Card className="no-print">
        <CardBody>
          <form method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Select name="level" defaultValue={searchParams.level ?? ""}>
              <option value="">All levels</option>
              {LEVELS.map((l) => (<option key={l} value={l}>{l} Level</option>))}
            </Select>
            <Select name="venue" defaultValue={searchParams.venue ?? ""}>
              <option value="">All venues</option>
              {venueOptions.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
            </Select>
            <Select name="lecturer" defaultValue={searchParams.lecturer ?? ""}>
              <option value="">All lecturers</option>
              {lecturerOptions.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
            </Select>
            <Select name="day" defaultValue={searchParams.day ?? ""}>
              <option value="">All days</option>
              {DAYS.map((d) => (<option key={d} value={d}>{DAY_LABELS[d]}</option>))}
            </Select>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Apply</Button>
              <Link href="/hod/timetable" className="flex-1">
                <Button variant="secondary" className="w-full">Reset</Button>
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {grid.length === 0 ? (
        <Alert variant="info">
          No approved classes match these filters.{" "}
          <Link href="/hod/generate" className="font-semibold underline">Generate the timetable</Link>{" "}
          to fill your department automatically.
        </Alert>
      ) : (
        <TimetableGrid
          allocations={grid}
          dayStart={settings.dayStartTime}
          dayEnd={settings.dayEndTime}
          slotMinutes={settings.slotDurationMinutes}
          days={settings.workingDays}
        />
      )}
    </div>
  );
}
