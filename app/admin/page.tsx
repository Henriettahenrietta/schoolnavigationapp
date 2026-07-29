import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { StatCard } from "@/components/stat-card";
import { Card, CardBody, CardHeader, Alert, Badge } from "@/components/ui";
import { IconBook, IconCalendar, IconClipboard, IconUsers } from "@/components/icons";

// Admin dashboard. Real counts from the active session; the charts and richer widgets
// described in the spec arrive with Phase 6/8.
export default async function AdminDashboard() {
  const user = await requireRole("admin");
  const session = await prisma.session.findFirst({ where: { isActive: true } });

  let courses = 0;
  let allocatedCourseIds = new Set<number>();
  let pending = 0;
  if (session) {
    const [courseCount, approvedAllocs, pendingCount] = await Promise.all([
      prisma.course.count({ where: { sessionId: session.id } }),
      prisma.allocation.findMany({
        where: { sessionId: session.id, status: "approved" },
        select: { courseId: true },
      }),
      prisma.allocation.count({ where: { sessionId: session.id, status: "pending" } }),
    ]);
    courses = courseCount;
    allocatedCourseIds = new Set(approvedAllocs.map((a) => a.courseId));
    pending = pendingCount;
  }
  const [lecturers, venues] = await Promise.all([
    prisma.user.count({ where: { role: "lecturer" } }),
    prisma.venue.count(),
  ]);

  const allocated = allocatedCourseIds.size;
  const unallocated = Math.max(courses - allocated, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-slate-500">
          {session ? (
            <>
              Active session <Badge variant="blue">{session.name}</Badge> ·{" "}
              <span className="capitalize">{session.semester}</span> semester
            </>
          ) : (
            "No active session yet."
          )}
        </p>
      </div>

      {!session && (
        <Alert variant="warning" title="No active session">
          Create and activate a session to start allocating courses.
        </Alert>
      )}

      {session && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
            session.isPublished
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`grid h-10 w-10 place-items-center rounded-lg ${
                session.isPublished ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"
              }`}
            >
              <IconCalendar />
            </span>
            <div>
              <p className="flex items-center gap-2 font-semibold text-slate-800">
                Timetable
                <Badge variant={session.isPublished ? "green" : "amber"}>
                  {session.isPublished ? "● Published" : "Unpublished"}
                </Badge>
              </p>
              <p className="text-sm text-slate-500">
                {session.isPublished
                  ? "Students can view the published timetable at /timetable."
                  : "Not visible to students yet. Publish it from the master timetable."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {session.isPublished && (
              <Link
                href="/timetable"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View public
              </Link>
            )}
            <Link
              href="/admin/timetable"
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {session.isPublished ? "Manage" : "Publish"}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Courses" value={courses} icon={<IconBook />} accent="brand" />
        <StatCard
          label="Allocated"
          value={allocated}
          hint={`${unallocated} still unallocated`}
          icon={<IconCalendar />}
          accent="green"
        />
        <StatCard
          label="Pending requests"
          value={pending}
          icon={<IconClipboard />}
          accent="amber"
        />
        <StatCard label="Lecturers" value={lecturers} icon={<IconUsers />} accent="slate" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-800">What's next</h2>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• Phase 3 adds CRUD for sessions, departments, courses, venues and lecturers.</li>
            <li>• Phase 4 builds the conflict engine that powers real-time clash rejection.</li>
            <li>• Phase 7 adds one-click automatic timetable generation.</li>
          </ul>
          <p className="mt-4 text-sm text-slate-500">
            {venues} venues configured · {lecturers} lecturers registered.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
