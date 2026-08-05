import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHod } from "@/lib/auth/current-user";
import { StatCard } from "@/components/stat-card";
import { Card, CardBody, CardHeader, Badge, Alert } from "@/components/ui";
import { IconBook, IconUsers, IconCalendar, IconGrid } from "@/components/icons";
import { DAY_LABELS } from "@/lib/constants";
import { NoDepartment } from "./no-department";

export const dynamic = "force-dynamic";

export default async function HodDashboard() {
  const { user, departmentId } = await requireHod();
  if (departmentId == null) return <NoDepartment title="HOD dashboard" />;

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  const department = await prisma.department.findUnique({ where: { id: departmentId } });

  const [allocations, courses, lecturers, pending, unscheduled] = await Promise.all([
    session
      ? prisma.allocation.findMany({
          where: { sessionId: session.id, status: "approved", course: { departmentId } },
          include: { course: true, lecturer: { select: { name: true } }, venue: { select: { name: true } } },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        })
      : Promise.resolve([]),
    session
      ? prisma.course.count({ where: { sessionId: session.id, departmentId } })
      : Promise.resolve(0),
    prisma.user.count({ where: { role: "lecturer", departmentId } }),
    session
      ? prisma.allocation.count({
          where: { sessionId: session.id, status: "pending", course: { departmentId } },
        })
      : Promise.resolve(0),
    session
      ? prisma.course.count({
          where: {
            sessionId: session.id,
            departmentId,
            allocations: { none: { status: { in: ["approved", "pending"] } } },
          },
        })
      : Promise.resolve(0),
  ]);

  const shortcuts = [
    { href: "/hod/courses", label: "Courses", body: "Every course in your department and how it is scheduled.", icon: <IconBook /> },
    { href: "/hod/lecturers", label: "Lecturers", body: "Staff registered under you, with their weekly teaching load.", icon: <IconUsers /> },
    { href: "/hod/allocations", label: "Classes", body: "Replace a lecturer, move a slot, or add a class.", icon: <IconGrid /> },
    { href: "/hod/timetable", label: "Timetable", body: "Your department's grid, printable and exportable.", icon: <IconCalendar /> },
    { href: "/hod/requests", label: "Requests", body: "Approve, reject or override lecturer requests.", icon: <IconCalendar /> },
    { href: "/hod/generate", label: "Generate", body: "Rebuild your department's timetable automatically.", icon: <IconGrid /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {department?.name ?? "Department"}
          </h1>
          {department && <Badge variant="blue">{department.code}</Badge>}
        </div>
        <p className="mt-1 text-slate-500">
          Head of Department: {user.name} · {session ? `${session.name} · ${session.semester} semester` : "No active session"}
        </p>
      </div>

      {!session && (
        <Alert variant="warning" title="No active session">
          An administrator needs to activate a session before your department can be scheduled.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Department courses" value={courses} icon={<IconBook />} accent="brand" />
        <StatCard label="Scheduled classes" value={allocations.length} icon={<IconGrid />} accent="green" />
        <StatCard label="Lecturers" value={lecturers} icon={<IconUsers />} accent="slate" />
        <StatCard label="Pending requests" value={pending} icon={<IconCalendar />} accent="amber" />
      </div>

      {pending > 0 && (
        <Alert variant="info">
          {pending} request{pending === 1 ? "" : "s"} waiting on you.{" "}
          <Link href="/hod/requests" className="font-semibold underline">Review them</Link>.
        </Alert>
      )}
      {unscheduled > 0 && (
        <Alert variant="warning">
          {unscheduled} course{unscheduled === 1 ? " has" : "s have"} no class scheduled.{" "}
          <Link href="/hod/generate" className="font-semibold underline">Generate the timetable</Link>.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-md"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-700">
              {s.icon}
            </span>
            <p className="mt-3 font-semibold text-slate-900 group-hover:text-brand-700">{s.label}</p>
            <p className="mt-1 text-sm text-slate-500">{s.body}</p>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">Scheduled classes</h2>
              <p className="text-sm text-slate-500">Approved classes in your department.</p>
            </div>
            <Link href="/hod/timetable" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              View full timetable
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {allocations.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nothing scheduled yet.{" "}
              <Link href="/hod/generate" className="font-semibold text-brand-600 underline">
                Run the generator
              </Link>{" "}
              to fill your department.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {allocations.slice(0, 6).map((alloc) => (
                <div key={alloc.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{alloc.course.code} · {alloc.course.title}</p>
                  <p className="text-sm text-slate-600">
                    {DAY_LABELS[alloc.dayOfWeek as keyof typeof DAY_LABELS] ?? alloc.dayOfWeek}{" "}
                    {alloc.startTime}–{alloc.endTime} · {alloc.venue.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Lecturer: {alloc.lecturer.name}</p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
