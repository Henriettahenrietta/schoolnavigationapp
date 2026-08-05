import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardBody, CardHeader, Badge, Alert } from "@/components/ui";
import { IconBuilding, IconBook, IconCalendar } from "@/components/icons";
import { DAY_LABELS } from "@/lib/constants";
import { durationMinutes } from "@/lib/time";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  code: string;
  title: string;
  level: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venueName: string;
  status: string;
};

type DeptCard = {
  id: number;
  name: string;
  code: string;
  headName: string | null;
  isHome: boolean;
  rows: Row[];
  minutes: number;
};

export default async function MyDepartmentsPage() {
  const user = await requireRole("lecturer");
  const session = await prisma.session.findFirst({ where: { isActive: true } });

  const allocations = session
    ? await prisma.allocation.findMany({
        where: {
          sessionId: session.id,
          lecturerId: user.id,
          status: { in: ["approved", "pending"] },
        },
        include: {
          course: { include: { department: true } },
          venue: { select: { name: true } },
        },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      })
    : [];

  // A lecturer may teach across departments, so the set shown is their registered
  // department plus every department they actually have a class in.
  const byDepartment = new Map<number, DeptCard>();

  const ensure = (
    d: { id: number; name: string; code: string },
    isHome: boolean,
  ): DeptCard => {
    const found = byDepartment.get(d.id);
    if (found) {
      found.isHome ||= isHome;
      return found;
    }
    const created: DeptCard = {
      id: d.id, name: d.name, code: d.code,
      headName: null, isHome, rows: [], minutes: 0,
    };
    byDepartment.set(d.id, created);
    return created;
  };

  if (user.department) ensure(user.department, true);

  for (const a of allocations) {
    const card = ensure(a.course.department, false);
    card.rows.push({
      id: a.id,
      code: a.course.code, title: a.course.title, level: a.course.level,
      dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime,
      venueName: a.venue.name, status: a.status,
    });
    if (a.status === "approved") {
      card.minutes += durationMinutes(a.startTime, a.endTime);
    }
  }

  // Who to talk to about each department's timetable.
  const heads = await prisma.user.findMany({
    where: { role: "hod", departmentId: { in: [...byDepartment.keys()] } },
    select: { name: true, departmentId: true },
  });
  for (const h of heads) {
    const card = h.departmentId != null ? byDepartment.get(h.departmentId) : undefined;
    if (card) card.headName = h.name;
  }

  // Home department first, then the ones with most teaching.
  const cards = [...byDepartment.values()].sort((a, b) => {
    if (a.isHome !== b.isHome) return a.isHome ? -1 : 1;
    return b.rows.length - a.rows.length;
  });

  const teachingIn = cards.filter((c) => c.rows.length > 0).length;
  const totalClasses = allocations.length;
  const totalHours = (cards.reduce((s, c) => s + c.minutes, 0) / 60).toFixed(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My departments"
        subtitle={
          session
            ? `Every department you teach in this session. ${session.name} · ${session.semester} semester.`
            : "Every department you teach in."
        }
      />

      {!session && (
        <Alert variant="warning" title="No active session">
          There is no active session yet, so only your registered department is shown.
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={teachingIn === 1 ? "Department taught in" : "Departments taught in"}
          value={teachingIn}
          icon={<IconBuilding />}
          accent="brand"
        />
        <StatCard label="Classes" value={totalClasses} icon={<IconBook />} accent="green" />
        <StatCard label="Weekly hours" value={totalHours} icon={<IconCalendar />} accent="slate" />
      </div>

      {teachingIn > 1 && (
        <Alert variant="info">
          You teach across <strong>{teachingIn} departments</strong>. Each one is listed
          below with its own classes and Head of Department.
        </Alert>
      )}

      {cards.map((c) => (
        <Card key={c.id}>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">
                  {c.name} <span className="text-slate-400">({c.code})</span>
                </h2>
                <p className="text-sm text-slate-500">
                  Head of Department:{" "}
                  {c.headName ? (
                    <span className="font-medium text-slate-700">{c.headName}</span>
                  ) : (
                    <span className="text-slate-400">not appointed yet</span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.isHome && <Badge variant="blue">My department</Badge>}
                {c.rows.length > 0 ? (
                  <Badge variant="green">
                    {c.rows.length} class{c.rows.length === 1 ? "" : "es"} · {(c.minutes / 60).toFixed(1)} h
                  </Badge>
                ) : (
                  <Badge variant="slate">No classes</Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {c.rows.length === 0 ? (
              <p className="text-sm text-slate-500">
                You are registered here but have no classes this session.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {c.rows.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="font-medium text-slate-800">
                      {r.code} · {r.title}
                      <span className="ml-2 align-middle">
                        <Badge variant="blue">{r.level} L</Badge>
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-3 text-slate-500">
                      <span>{DAY_LABELS[r.dayOfWeek as keyof typeof DAY_LABELS] ?? r.dayOfWeek}</span>
                      <span>{r.startTime}–{r.endTime}</span>
                      <span>{r.venueName}</span>
                      <Badge variant={r.status === "approved" ? "green" : "amber"}>{r.status}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ))}

      {cards.length === 0 && (
        <Alert variant="info">
          You are not registered to a department and have no classes yet. An administrator
          can set your department on the Lecturers screen.
        </Alert>
      )}
    </div>
  );
}
