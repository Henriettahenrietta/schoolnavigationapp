import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { StatCard } from "@/components/stat-card";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { IconBook, IconCalendar, IconClipboard } from "@/components/icons";
import { durationMinutes } from "@/lib/time";

// Lecturer dashboard: this lecturer's own allocation figures for the active session.
export default async function LecturerDashboard() {
  const user = await requireRole("lecturer");
  const session = await prisma.session.findFirst({ where: { isActive: true } });

  const allocations = session
    ? await prisma.allocation.findMany({
        where: { sessionId: session.id, lecturerId: user.id },
        include: { course: true, venue: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      })
    : [];

  const approved = allocations.filter((a) => a.status === "approved");
  const pending = allocations.filter((a) => a.status === "pending");
  const weeklyMinutes = approved.reduce(
    (sum, a) => sum + durationMinutes(a.startTime, a.endTime),
    0,
  );
  const weeklyHours = (weeklyMinutes / 60).toFixed(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hello, {user.name.split(" ").slice(-1)[0]}
        </h1>
        <p className="mt-1 text-slate-500">
          {user.department ? user.department.name : "No department"} ·{" "}
          {session ? (
            <>
              Session <Badge variant="blue">{session.name}</Badge>
            </>
          ) : (
            "No active session"
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Approved courses" value={approved.length} icon={<IconBook />} accent="green" />
        <StatCard label="Pending requests" value={pending.length} icon={<IconClipboard />} accent="amber" />
        <StatCard label="Weekly hours" value={weeklyHours} icon={<IconCalendar />} accent="brand" />
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-800">My allocations</h2>
        </CardHeader>
        <CardBody>
          {approved.length === 0 && pending.length === 0 ? (
            <p className="text-sm text-slate-500">
              You have no allocations yet. Requesting allocations with live conflict
              checking arrives in Phase 5.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {allocations.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-2.5">
                  <span className="font-medium text-slate-800">
                    {a.course.code} — {a.course.title}
                  </span>
                  <span className="flex items-center gap-3 text-slate-500">
                    <span className="uppercase">{a.dayOfWeek}</span>
                    <span>
                      {a.startTime}–{a.endTime}
                    </span>
                    <span>{a.venue.name}</span>
                    <Badge variant={a.status === "approved" ? "green" : "amber"}>
                      {a.status}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
