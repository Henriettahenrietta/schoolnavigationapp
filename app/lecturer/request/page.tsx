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

  // Lecturers may teach across departments — offer every course, grouped by department.
  const allCourses = await prisma.course.findMany({
    where: { sessionId: session.id },
    include: { department: true },
    orderBy: [{ departmentId: "asc" }, { level: "asc" }, { code: "asc" }],
  });
  const courses = allCourses.map((c) => ({ id: c.id, code: c.code, title: c.title, departmentName: c.department.name }));
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
