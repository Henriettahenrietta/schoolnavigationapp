import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui";
import { RequestForm } from "./request-form";

export default async function RequestAllocationPage() {
  const user = await requireRole("lecturer");
  const session = await prisma.session.findFirst({ where: { isActive: true } });

  if (!session) {
    return (
      <div>
        <PageHeader title="Request allocation" />
        <Alert variant="warning" title="No active session">
          There is no active session yet. Please check back once an admin activates one.
        </Alert>
      </div>
    );
  }

  // Courses the lecturer can request: their department's courses in the active session
  // (falling back to all session courses if they have no department).
  const courses = await prisma.course.findMany({
    where: {
      sessionId: session.id,
      ...(user.departmentId ? { departmentId: user.departmentId } : {}),
    },
    orderBy: [{ level: "asc" }, { code: "asc" }],
    select: { id: true, code: true, title: true },
  });
  const venues = await prisma.venue.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, capacity: true },
  });

  return (
    <div>
      <PageHeader
        title="Request allocation"
        subtitle={`Active session: ${session.name} (${session.semester} semester).`}
      />
      <RequestForm sessionId={session.id} lecturerId={user.id} courses={courses} venues={venues} />
    </div>
  );
}
