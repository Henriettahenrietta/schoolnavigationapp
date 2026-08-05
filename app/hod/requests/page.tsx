import { prisma } from "@/lib/prisma";
import { requireHod } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/table";
import { Badge, Alert } from "@/components/ui";
import { DAY_LABELS } from "@/lib/constants";
import { RequestActions } from "@/app/admin/requests/request-actions";
import { NoDepartment } from "../no-department";
import { approveHodRequest, rejectHodRequest, overrideHodRequest } from "./actions";

export const dynamic = "force-dynamic";

export default async function HodRequestsPage() {
  const { departmentId } = await requireHod();
  if (departmentId == null) return <NoDepartment title="Allocation requests" />;

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  const department = await prisma.department.findUnique({ where: { id: departmentId } });

  // Routed by the course's department: a lecturer from another department requesting one
  // of our courses still lands in this queue.
  const pending = session
    ? await prisma.allocation.findMany({
        where: { sessionId: session.id, status: "pending", course: { departmentId } },
        include: {
          course: true,
          lecturer: { include: { department: { select: { code: true } } } },
          venue: true,
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Allocation requests"
        subtitle={`${department?.name ?? "Your department"}. Approve clean requests, reject with a reason, or override.`}
      />

      {pending.length > 0 && (
        <Alert variant="info" className="mb-4">
          {pending.length} request{pending.length === 1 ? "" : "s"} awaiting your review. Approve is
          blocked if a request now clashes. Override forces it through and bumps the clashing class,
          but only where that class belongs to your department.
        </Alert>
      )}

      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Course</TH><TH>Lecturer</TH><TH>Day</TH><TH>Time</TH>
            <TH>Venue</TH><TH>Note</TH><TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {pending.length === 0 ? (
            <EmptyRow colSpan={7}>No pending requests for your department.</EmptyRow>
          ) : (
            pending.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium text-slate-800">
                  {a.course.code} · {a.course.title}
                  <span className="ml-2 align-middle"><Badge variant="blue">{a.course.level} L</Badge></span>
                </TD>
                <TD>
                  {a.lecturer.name}
                  {a.lecturer.departmentId !== departmentId && (
                    <span className="ml-2 align-middle">
                      <Badge variant="slate">{a.lecturer.department?.code ?? "external"}</Badge>
                    </span>
                  )}
                </TD>
                <TD>{DAY_LABELS[a.dayOfWeek as keyof typeof DAY_LABELS] ?? a.dayOfWeek}</TD>
                <TD>{a.startTime}–{a.endTime}</TD>
                <TD>{a.venue.name}</TD>
                <TD className="max-w-[14rem] text-xs text-red-500">{a.declineReason ?? ""}</TD>
                <TD>
                  <RequestActions
                    id={a.id}
                    approveAction={approveHodRequest}
                    rejectAction={rejectHodRequest}
                    overrideAction={overrideHodRequest}
                  />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
