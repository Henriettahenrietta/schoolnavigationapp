import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { loadSettings } from "@/lib/conflict/checker";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, Select, Button, Badge, Alert } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { PrintHeader } from "@/components/print-header";
import { TimetableGrid, type GridAllocation } from "@/components/timetable-grid";
import { DAYS, DAY_LABELS, LEVELS } from "@/lib/constants";
import { togglePublish } from "./actions";

export default async function MasterTimetablePage({
  searchParams,
}: {
  searchParams: { department?: string; level?: string; venue?: string; lecturer?: string; day?: string };
}) {
  await requireRole("admin");
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) {
    return (
      <div>
        <PageHeader title="Master timetable" />
        <Alert variant="warning" title="No active session">Activate a session first.</Alert>
      </div>
    );
  }
  const settings = await loadSettings();
  const [departments, venues, lecturers] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.venue.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { role: "lecturer" }, orderBy: { name: "asc" } }),
  ]);

  const department = searchParams.department ? Number(searchParams.department) : undefined;
  const level = searchParams.level ? Number(searchParams.level) : undefined;
  const venue = searchParams.venue ? Number(searchParams.venue) : undefined;
  const lecturer = searchParams.lecturer ? Number(searchParams.lecturer) : undefined;
  const day = searchParams.day || undefined;

  const allocations = await prisma.allocation.findMany({
    where: {
      sessionId: session.id,
      status: "approved",
      ...(venue ? { venueId: venue } : {}),
      ...(lecturer ? { lecturerId: lecturer } : {}),
      ...(day ? { dayOfWeek: day } : {}),
      ...(department || level
        ? { course: { ...(department ? { departmentId: department } : {}), ...(level ? { level } : {}) } }
        : {}),
    },
    include: { course: true, venue: true, lecturer: { select: { name: true } } },
  });

  const grid: GridAllocation[] = allocations.map((a) => ({
    id: a.id, courseCode: a.course.code, courseTitle: a.course.title,
    lecturerName: a.lecturer.name, venueName: a.venue.name, departmentId: a.course.departmentId,
    dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime, isLocked: a.isLocked,
  }));

  const exportUrl = `/api/export/timetable?${new URLSearchParams(searchParams as Record<string, string>).toString()}`;

  return (
    <div className="space-y-5">
      <PrintHeader title="Master timetable" session={`${session.name} · ${session.semester}`} generatedOn={new Date().toLocaleDateString()} />
      <PageHeader
        title="Master timetable"
        subtitle={`${session.name} · ${session.semester} · ${allocations.length} classes`}
        action={
          <div className="no-print flex items-center gap-2">
            <Badge variant={session.isPublished ? "green" : "slate"}>
              {session.isPublished ? "Published" : "Unpublished"}
            </Badge>
            <form action={togglePublish}>
              <input type="hidden" name="sessionId" value={session.id} />
              <Button type="submit" variant={session.isPublished ? "outline" : "primary"}>
                {session.isPublished ? "Unpublish" : "Publish"}
              </Button>
            </form>
            <Link href={exportUrl}><Button variant="secondary">Export CSV</Button></Link>
            <PrintButton />
          </div>
        }
      />

      {/* Filters (server GET form) */}
      <Card className="no-print">
        <CardBody>
          <form method="get" className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <Select name="department" defaultValue={searchParams.department ?? ""}>
              <option value="">All departments</option>
              {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
            </Select>
            <Select name="level" defaultValue={searchParams.level ?? ""}>
              <option value="">All levels</option>
              {LEVELS.map((l) => (<option key={l} value={l}>{l} Level</option>))}
            </Select>
            <Select name="venue" defaultValue={searchParams.venue ?? ""}>
              <option value="">All venues</option>
              {venues.map((v) => (<option key={v.id} value={v.id}>{v.name}</option>))}
            </Select>
            <Select name="lecturer" defaultValue={searchParams.lecturer ?? ""}>
              <option value="">All lecturers</option>
              {lecturers.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
            </Select>
            <Select name="day" defaultValue={searchParams.day ?? ""}>
              <option value="">All days</option>
              {DAYS.map((d) => (<option key={d} value={d}>{DAY_LABELS[d]}</option>))}
            </Select>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Apply</Button>
              <Link href="/admin/timetable" className="flex-1"><Button variant="secondary" className="w-full">Reset</Button></Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {grid.length === 0 ? (
        <Alert variant="info">No approved allocations match these filters.</Alert>
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
