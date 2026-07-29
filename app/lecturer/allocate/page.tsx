import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui";
import { AllocateForm } from "./allocate-form";

export default async function AllocatePage() {
  const user = await requireRole("lecturer");
  const session = await prisma.session.findFirst({ where: { isActive: true } });

  if (!session) {
    return (
      <div>
        <PageHeader title="Allocate my course" />
        <Alert variant="warning" title="No active session">
          There is no active session yet. Please check back once an admin activates one.
        </Alert>
      </div>
    );
  }

  const courses = await prisma.course.findMany({
    where: { sessionId: session.id, ...(user.departmentId ? { departmentId: user.departmentId } : {}) },
    orderBy: [{ level: "asc" }, { code: "asc" }],
    select: { id: true, code: true, title: true },
  });
  const venues = await prisma.venue.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, capacity: true } });

  return (
    <div>
      <PageHeader
        title="Allocate my course"
        subtitle="Instant self-service allocation — free slots are approved on the spot."
      />
      <AllocateForm courses={courses} venues={venues} />
    </div>
  );
}
