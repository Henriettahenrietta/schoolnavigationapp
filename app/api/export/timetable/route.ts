import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DAY_LABELS } from "@/lib/constants";

// Exports the (filtered) approved timetable as an Excel-compatible CSV file.
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "admin" && user.role !== "hod")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) return new Response("No active session", { status: 404 });

  const sp = req.nextUrl.searchParams;
  // A HOD may only ever export their own department, whatever the query string says.
  const isHod = user.role === "hod";
  if (isHod && user.departmentId == null) {
    return new Response("No department assigned", { status: 403 });
  }
  const department = isHod
    ? (user.departmentId as number)
    : sp.get("department")
      ? Number(sp.get("department"))
      : undefined;
  const level = sp.get("level") ? Number(sp.get("level")) : undefined;
  const venue = sp.get("venue") ? Number(sp.get("venue")) : undefined;
  const lecturer = sp.get("lecturer") ? Number(sp.get("lecturer")) : undefined;
  const day = sp.get("day") || undefined;

  const allocations = await prisma.allocation.findMany({
    where: {
      sessionId: session.id,
      status: "approved",
      ...(venue ? { venueId: venue } : {}),
      ...(lecturer ? { lecturerId: lecturer } : {}),
      ...(day ? { dayOfWeek: day } : {}),
      ...(department || level ? { course: { ...(department ? { departmentId: department } : {}), ...(level ? { level } : {}) } } : {}),
    },
    include: { course: { include: { department: true } }, venue: true, lecturer: { select: { name: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const header = ["Day", "Start", "End", "Code", "Title", "Level", "Department", "Lecturer", "Venue"];
  const lines = [header.join(",")];
  for (const a of allocations) {
    lines.push(
      [
        DAY_LABELS[a.dayOfWeek as keyof typeof DAY_LABELS] ?? a.dayOfWeek,
        a.startTime, a.endTime, a.course.code, a.course.title, a.course.level,
        a.course.department.code, a.lecturer.name, a.venue.name,
      ].map((v) => esc(String(v))).join(","),
    );
  }
  const csv = lines.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="timetable-${session.name.replace("/", "-")}.csv"`,
    },
  });
}
