import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireHod } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/table";
import { Badge, Alert } from "@/components/ui";
import { DAY_LABELS } from "@/lib/constants";
import { NoDepartment } from "../no-department";

export const dynamic = "force-dynamic";

export default async function HodCoursesPage() {
  const { departmentId } = await requireHod();
  if (departmentId == null) return <NoDepartment title="Department courses" />;

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  const department = await prisma.department.findUnique({ where: { id: departmentId } });

  const courses = session
    ? await prisma.course.findMany({
        where: { sessionId: session.id, departmentId },
        orderBy: [{ level: "asc" }, { code: "asc" }],
        include: {
          allocations: {
            where: { status: { in: ["approved", "pending"] } },
            include: { lecturer: { select: { name: true } }, venue: { select: { name: true } } },
          },
        },
      })
    : [];

  const unallocated = courses.filter((c) => c.allocations.length === 0).length;

  return (
    <div>
      <PageHeader
        title="Department courses"
        subtitle={`${department?.name ?? "Your department"}${session ? ` · ${session.name} · ${session.semester} semester` : ""}`}
      />

      {!session ? (
        <Alert variant="warning" title="No active session">
          There is no active session, so no courses are listed.
        </Alert>
      ) : (
        <>
          {unallocated > 0 && (
            <Alert variant="info" className="mb-4">
              {unallocated} course{unallocated === 1 ? " has" : "s have"} no class scheduled yet.{" "}
              <Link href="/hod/generate" className="font-semibold text-brand-700 underline">
                Run the generator
              </Link>{" "}
              to place them automatically.
            </Alert>
          )}

          <Table>
            <THead>
              <TR className="hover:bg-transparent">
                <TH>Code</TH><TH>Title</TH><TH>Level</TH><TH>Units</TH>
                <TH>Students</TH><TH>Scheduled as</TH>
              </TR>
            </THead>
            <TBody>
              {courses.length === 0 ? (
                <EmptyRow colSpan={6}>No courses in this department for the active session.</EmptyRow>
              ) : (
                courses.map((c) => (
                  <TR key={c.id}>
                    <TD className="font-medium text-slate-800">{c.code}</TD>
                    <TD>{c.title}</TD>
                    <TD><Badge variant="blue">{c.level} L</Badge></TD>
                    <TD>{c.creditUnits}</TD>
                    <TD>{c.expectedStudents}</TD>
                    <TD className="text-xs">
                      {c.allocations.length === 0 ? (
                        <Badge variant="amber">Not scheduled</Badge>
                      ) : (
                        <div className="space-y-0.5">
                          {c.allocations.map((a) => (
                            <div key={a.id} className="text-slate-600">
                              {DAY_LABELS[a.dayOfWeek as keyof typeof DAY_LABELS] ?? a.dayOfWeek}{" "}
                              {a.startTime}–{a.endTime} · {a.venue.name}
                              <span className="text-slate-400"> · {a.lecturer.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </>
      )}
    </div>
  );
}
