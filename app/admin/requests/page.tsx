import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/table";
import { Badge, Alert } from "@/components/ui";
import { DAY_LABELS } from "@/lib/constants";
import { RequestActions } from "./request-actions";
import { approveRequest, rejectRequest, overrideRequest } from "./actions";

export default async function RequestsPage() {
  await requireRole("admin");
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  const pending = session
    ? await prisma.allocation.findMany({
        where: { sessionId: session.id, status: "pending" },
        include: { course: true, lecturer: true, venue: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Allocation requests"
        subtitle="Approve clean requests, reject with a reason, or override existing allocations."
      />

      {pending.length > 0 && (
        <Alert variant="info" className="mb-4">
          {pending.length} request{pending.length === 1 ? "" : "s"} awaiting review. Approve is
          blocked if a request now clashes. Use Override to force it through.
        </Alert>
      )}

      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Course</TH>
            <TH>Lecturer</TH>
            <TH>Day</TH>
            <TH>Time</TH>
            <TH>Venue</TH>
            <TH>Note</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {pending.length === 0 ? (
            <EmptyRow colSpan={7}>No pending requests. 🎉</EmptyRow>
          ) : (
            pending.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium text-slate-800">
                  {a.course.code} · {a.course.title}
                  <span className="ml-2 align-middle">
                    <Badge variant="blue">{a.course.level} L</Badge>
                  </span>
                </TD>
                <TD>{a.lecturer.name}</TD>
                <TD>{DAY_LABELS[a.dayOfWeek as keyof typeof DAY_LABELS] ?? a.dayOfWeek}</TD>
                <TD>
                  {a.startTime}–{a.endTime}
                </TD>
                <TD>{a.venue.name}</TD>
                <TD className="max-w-[14rem] text-xs text-red-500">{a.declineReason ?? ""}</TD>
                <TD>
                  <RequestActions
                    id={a.id}
                    approveAction={approveRequest}
                    rejectAction={rejectRequest}
                    overrideAction={overrideRequest}
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
