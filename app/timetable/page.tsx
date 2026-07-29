import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { loadSettings } from "@/lib/conflict/checker";
import { Card, CardBody, Select, Button, Alert } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { PrintHeader } from "@/components/print-header";
import { TimetableGrid, type GridAllocation } from "@/components/timetable-grid";
import { LEVELS } from "@/lib/constants";
import { SCHOOL_NAME, SCHOOL_SHORT } from "@/lib/branding";

export const dynamic = "force-dynamic";

// Public, no-login timetable. Serves the PUBLISHED timetable only; a department + level
// selector filters to a class timetable. Printable to PDF.
export default async function PublicTimetablePage({
  searchParams,
}: {
  searchParams: { department?: string; level?: string };
}) {
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  const published = session?.isPublished ?? false;
  const settings = await loadSettings();
  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });

  const department = searchParams.department ? Number(searchParams.department) : undefined;
  const level = searchParams.level ? Number(searchParams.level) : undefined;

  const allocations =
    published && session && department && level
      ? await prisma.allocation.findMany({
          where: { sessionId: session.id, status: "approved", course: { departmentId: department, level } },
          include: { course: true, venue: true, lecturer: { select: { name: true } } },
        })
      : [];

  const grid: GridAllocation[] = allocations.map((a) => ({
    id: a.id, courseCode: a.course.code, courseTitle: a.course.title,
    lecturerName: a.lecturer.name, venueName: a.venue.name, departmentId: a.course.departmentId,
    dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">{SCHOOL_SHORT}</span>
            <span className="font-semibold text-slate-800">{SCHOOL_NAME}</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-brand-600 hover:text-brand-700">Staff sign in</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <PrintHeader
          title="Class Timetable"
          session={session ? `${session.name} · ${session.semester}` : undefined}
          generatedOn={new Date().toLocaleDateString()}
        />
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {session ? `${session.name} — ${session.semester} semester` : "Timetable"}
          </h1>
          {grid.length > 0 && <PrintButton />}
        </div>

        {!published ? (
          <Card><CardBody>
            <Alert variant="info" title="Timetable not yet published">
              The timetable for this session has not been published yet. Please check back later.
            </Alert>
          </CardBody></Card>
        ) : (
          <>
            <Card className="no-print mb-5">
              <CardBody>
                <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Select name="department" defaultValue={searchParams.department ?? ""} required>
                    <option value="">Select department…</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </Select>
                  <Select name="level" defaultValue={searchParams.level ?? ""} required>
                    <option value="">Select level…</option>
                    {LEVELS.map((l) => (<option key={l} value={l}>{l} Level</option>))}
                  </Select>
                  <Button type="submit">View timetable</Button>
                </form>
              </CardBody>
            </Card>

            {department && level ? (
              grid.length > 0 ? (
                <TimetableGrid
                  allocations={grid}
                  dayStart={settings.dayStartTime}
                  dayEnd={settings.dayEndTime}
                  slotMinutes={settings.slotDurationMinutes}
                  days={settings.workingDays}
                  showLecturer
                />
              ) : (
                <Alert variant="info">No classes published for this department and level yet.</Alert>
              )
            ) : (
              <p className="text-sm text-slate-500">Choose a department and level to view the class timetable.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
