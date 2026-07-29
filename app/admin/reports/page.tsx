import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { loadSettings } from "@/lib/conflict/checker";
import { toMinutes, durationMinutes } from "@/lib/time";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardBody, Button, Alert } from "@/components/ui";
import { StatCard } from "@/components/stat-card";
import { PrintButton } from "@/components/print-button";
import { PrintHeader } from "@/components/print-header";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/table";

export default async function ReportsPage() {
  await requireRole("admin");
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) {
    return (
      <div>
        <PageHeader title="Reports" />
        <Alert variant="warning" title="No active session">Activate a session first.</Alert>
      </div>
    );
  }
  const settings = await loadSettings();
  const [allocations, departments, venues, lecturers, courseCount] = await Promise.all([
    prisma.allocation.findMany({
      where: { sessionId: session.id, status: "approved" },
      include: { course: { include: { department: true } }, venue: true, lecturer: { select: { id: true, name: true } } },
    }),
    prisma.department.findMany(),
    prisma.venue.findMany(),
    prisma.user.findMany({ where: { role: "lecturer" } }),
    prisma.course.count({ where: { sessionId: session.id } }),
  ]);

  const dayMinutes = (toMinutes(settings.dayEndTime) - toMinutes(settings.dayStartTime)) * settings.workingDays.length;

  // Allocations per department.
  const perDept = departments.map((d) => ({
    name: d.name,
    count: allocations.filter((a) => a.course.departmentId === d.id).length,
  }));

  // Venue utilisation %.
  const perVenue = venues
    .map((v) => {
      const used = allocations.filter((a) => a.venueId === v.id).reduce((s, a) => s + durationMinutes(a.startTime, a.endTime), 0);
      return { name: v.name, used, pct: dayMinutes ? Math.round((used / dayMinutes) * 100) : 0 };
    })
    .sort((a, b) => b.pct - a.pct);

  // Per-lecturer weekly workload (hours).
  const perLecturer = lecturers
    .map((l) => {
      const mins = allocations.filter((a) => a.lecturerId === l.id).reduce((s, a) => s + durationMinutes(a.startTime, a.endTime), 0);
      return { name: l.name, hours: (mins / 60).toFixed(1), over: mins / 60 > settings.maxWeeklyHoursPerLecturer };
    })
    .sort((a, b) => Number(b.hours) - Number(a.hours));

  const allocatedCourses = new Set(allocations.map((a) => a.courseId)).size;

  return (
    <div className="space-y-6">
      <PrintHeader title="Reports" session={`${session.name} · ${session.semester}`} generatedOn={new Date().toLocaleDateString()} />
      <PageHeader
        title="Reports"
        subtitle={`${session.name} · ${session.semester} semester`}
        action={
          <div className="no-print flex gap-2">
            <Link href="/api/export/timetable"><Button variant="secondary">Export CSV</Button></Link>
            <PrintButton />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Courses" value={courseCount} accent="brand" />
        <StatCard label="Allocated" value={allocatedCourses} hint={`${courseCount - allocatedCourses} unallocated`} accent="green" />
        <StatCard label="Classes" value={allocations.length} accent="slate" />
        <StatCard label="Avg venue use" value={`${perVenue.length ? Math.round(perVenue.reduce((s, v) => s + v.pct, 0) / perVenue.length) : 0}%`} accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><h2 className="font-semibold text-slate-800">Allocations per department</h2></CardHeader>
          <CardBody className="p-0">
            <Table>
              <THead><TR className="hover:bg-transparent"><TH>Department</TH><TH>Classes</TH></TR></THead>
              <TBody>
                {perDept.map((d) => (<TR key={d.name}><TD>{d.name}</TD><TD>{d.count}</TD></TR>))}
              </TBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-slate-800">Venue utilisation</h2></CardHeader>
          <CardBody className="p-0">
            <Table>
              <THead><TR className="hover:bg-transparent"><TH>Venue</TH><TH>Used</TH></TR></THead>
              <TBody>
                {perVenue.map((v) => (
                  <TR key={v.name}>
                    <TD>{v.name}</TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full bg-brand-500" style={{ width: `${Math.min(100, v.pct)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500">{v.pct}%</span>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold text-slate-800">Lecturer workload</h2></CardHeader>
          <CardBody className="p-0">
            <Table>
              <THead><TR className="hover:bg-transparent"><TH>Lecturer</TH><TH>Weekly hrs</TH></TR></THead>
              <TBody>
                {perLecturer.length === 0 ? (
                  <EmptyRow colSpan={2}>No approved classes.</EmptyRow>
                ) : (
                  perLecturer.map((l) => (
                    <TR key={l.name}>
                      <TD>{l.name}</TD>
                      <TD className={l.over ? "font-semibold text-red-600" : ""}>{l.hours}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
