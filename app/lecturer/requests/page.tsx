import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/table";
import { Badge, Button, Alert } from "@/components/ui";
import { DAY_LABELS } from "@/lib/constants";
import { cancelRequest } from "./actions";

const STATUS_VARIANT: Record<string, "green" | "amber" | "red" | "slate" | "blue"> = {
  approved: "green",
  pending: "amber",
  declined: "red",
  cancelled: "slate",
  draft: "blue",
};

export default async function MyRequestsPage({ searchParams }: { searchParams: { submitted?: string } }) {
  const user = await requireRole("lecturer");
  const session = await prisma.session.findFirst({ where: { isActive: true } });
  const allocations = session
    ? await prisma.allocation.findMany({
        where: { sessionId: session.id, lecturerId: user.id },
        include: { course: true, venue: true },
        orderBy: [{ createdAt: "desc" }],
      })
    : [];

  return (
    <div>
      <PageHeader
        title="My requests"
        subtitle="Every allocation you've requested, with live status."
        action={
          <Link href="/lecturer/request">
            <Button>+ New request</Button>
          </Link>
        }
      />

      {searchParams.submitted && (
        <Alert variant="success" className="mb-4">
          Request submitted. It's now pending admin approval.
        </Alert>
      )}

      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Course</TH>
            <TH>Day</TH>
            <TH>Time</TH>
            <TH>Venue</TH>
            <TH>Status</TH>
            <TH>Reason</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {allocations.length === 0 ? (
            <EmptyRow colSpan={7}>You haven't requested any allocations yet.</EmptyRow>
          ) : (
            allocations.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium text-slate-800">
                  {a.course.code} — {a.course.title}
                </TD>
                <TD>{DAY_LABELS[a.dayOfWeek as keyof typeof DAY_LABELS] ?? a.dayOfWeek}</TD>
                <TD>
                  {a.startTime}–{a.endTime}
                </TD>
                <TD>{a.venue.name}</TD>
                <TD>
                  <Badge variant={STATUS_VARIANT[a.status] ?? "slate"}>{a.status}</Badge>
                </TD>
                <TD className="max-w-xs text-xs text-slate-500">{a.declineReason ?? "—"}</TD>
                <TD className="text-right">
                  {a.status === "pending" ? (
                    <form action={cancelRequest}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="text-sm font-medium text-red-600 hover:text-red-700">Cancel</button>
                    </form>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
