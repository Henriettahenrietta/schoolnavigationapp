import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listCourseFreeSlots } from "@/lib/conflict/checker";

// Smart Assistant endpoint: returns conflict-free slots for a course across the week.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const courseId = Number(body?.courseId);
  const duration = Number(body?.duration) || 120;
  if (!courseId) return NextResponse.json({ slots: [] });

  const session = await prisma.session.findFirst({ where: { isActive: true } });
  if (!session) return NextResponse.json({ slots: [] });

  const lecturerId = user.role === "lecturer" ? user.id : Number(body?.lecturerId) || user.id;
  const slots = await listCourseFreeSlots(session.id, courseId, lecturerId, duration, 60);
  return NextResponse.json({ slots });
}
