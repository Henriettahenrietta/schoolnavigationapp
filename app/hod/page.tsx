import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { StatCard } from "@/components/stat-card";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { IconBook, IconUsers, IconCalendar, IconGrid } from "@/components/icons";

export default async function HodDashboard() {
  const user = await requireRole("hod");
  const session = await prisma.session.findFirst({ where: { isActive: true } });

  const departmentId = user.departmentId;
  const department = departmentId
    ? await prisma.department.findUnique({ where: { id: departmentId } })
    : null;

  const departmentCondition = departmentId ? { departmentId } : undefined;
  const courseSessionCondition = session ? { sessionId: session.id } : undefined;

  const allocations = session && departmentId
    ? await prisma.allocation.findMany({
        where: {
          sessionId: session.id,
          status: "approved",
          course: { departmentId },
        },
        include: { course: true, lecturer: true, venue: true },
      })
    : [];

  const courses = await prisma.course.count({
    where: {
      ...(courseSessionCondition ?? {}),
      ...(departmentCondition ?? {}),
    },
  });
  const lecturers = departmentId
    ? await prisma.user.count({
        where: { role: "lecturer", departmentId },
      })
    : 0;
  const venues = await prisma.venue.count();
  const allocatedCount = allocations.length;
  const uniqueLecturers = new Set(allocations.map((a) => a.lecturerId)).size;

  const pending = session && departmentId
    ? await prisma.allocation.count({
        where: {
          sessionId: session.id,
          status: "pending",
          course: { departmentId },
        },
      })
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">HOD dashboard</h1>
        <p className="mt-1 text-slate-500">
          {department ? department.name : "No department assigned"} · {session ? session.name : "No active session"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Department courses" value={courses} icon={<IconBook />} accent="brand" />
        <StatCard label="Allocated classes" value={allocatedCount} icon={<IconGrid />} accent="green" />
        <StatCard label="Lecturers" value={lecturers} icon={<IconUsers />} accent="slate" />
        <StatCard label="Pending allocations" value={pending} icon={<IconCalendar />} accent="amber" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-800">Recent allocations</h2>
              <p className="text-sm text-slate-500">Latest approved classes for your department.</p>
            </div>
            <Badge variant="blue">{session ? session.semester : "No active session"}</Badge>
          </div>
        </CardHeader>
        <CardBody>
          {allocations.length === 0 ? (
            <p className="text-sm text-slate-500">No approved classes are available yet.</p>
          ) : (
            <div className="grid gap-3">
              {allocations.slice(0, 6).map((alloc) => (
                <div key={alloc.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{alloc.course.code} · {alloc.course.title}</p>
                  <p className="text-sm text-slate-600">
                    {alloc.dayOfWeek.toUpperCase()} {alloc.startTime}–{alloc.endTime} · {alloc.venue.name}
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
