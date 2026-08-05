import { prisma } from "@/lib/prisma";
import { requireHod } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/table";
import { Badge } from "@/components/ui";
import { durationMinutes } from "@/lib/time";
import { NoDepartment } from "../no-department";

export const dynamic = "force-dynamic";

export default async function HodLecturersPage() {
  const { departmentId } = await requireHod();
  if (departmentId == null) return <NoDepartment title="Department lecturers" />;

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  const department = await prisma.department.findUnique({ where: { id: departmentId } });

  const lecturers = await prisma.user.findMany({
    where: { role: "lecturer", departmentId },
    orderBy: { name: "asc" },
    include: {
      allocations: session
        ? {
            where: { sessionId: session.id, status: { in: ["approved", "pending"] } },
            include: { course: { select: { code: true, departmentId: true } } },
          }
        : false,
    },
  });

  return (
    <div>
      <PageHeader
        title="Department lecturers"
        subtitle={`${department?.name ?? "Your department"} · ${lecturers.length} lecturer${lecturers.length === 1 ? "" : "s"}`}
      />

      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Name</TH><TH>Staff ID</TH><TH>Email</TH>
            <TH>Classes</TH><TH>Weekly hours</TH><TH>Teaching</TH>
          </TR>
        </THead>
        <TBody>
          {lecturers.length === 0 ? (
            <EmptyRow colSpan={6}>No lecturers are registered under this department.</EmptyRow>
          ) : (
            lecturers.map((l) => {
              const allocs = (l as any).allocations ?? [];
              const minutes = allocs.reduce(
                (sum: number, a: any) => sum + durationMinutes(a.startTime, a.endTime),
                0,
              );
              // A lecturer in this department may still teach elsewhere; show that split so
              // the Head sees their true load, not just the part they own.
              const ownDept = allocs.filter((a: any) => a.course.departmentId === departmentId).length;
              const outside = allocs.length - ownDept;

              return (
                <TR key={l.id}>
                  <TD className="font-medium text-slate-800">
                    {l.name}
                    {!l.isActive && <span className="ml-2"><Badge variant="slate">Disabled</Badge></span>}
                  </TD>
                  <TD>{l.staffId ?? "-"}</TD>
                  <TD className="text-xs text-slate-500">{l.email}</TD>
                  <TD>{allocs.length}</TD>
                  <TD>{(minutes / 60).toFixed(1)} h</TD>
                  <TD className="text-xs">
                    {allocs.length === 0 ? (
                      <span className="text-slate-400">Nothing scheduled</span>
                    ) : (
                      <>
                        <span className="text-slate-600">{ownDept} in {department?.code ?? "dept"}</span>
                        {outside > 0 && (
                          <span className="text-slate-400"> · {outside} elsewhere</span>
                        )}
                      </>
                    )}
                  </TD>
                </TR>
              );
            })
          )}
        </TBody>
      </Table>
    </div>
  );
}
