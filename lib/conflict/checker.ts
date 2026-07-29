import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { durationMinutes } from "../time";
import {
  checkConflicts,
  type ConflictResult,
  type ExistingAllocation,
  type SlotRequest,
  type Settings,
  type VenueInfo,
  type CourseInfo,
} from "./core";

// Accepts either the global client or a transaction client, so the same loaders work
// inside a $transaction for race-safe final inserts.
export type DB = PrismaClient | Prisma.TransactionClient;

// Database-backed conflict checker. Loads the current timetable state for a session and
// delegates to the pure core. Reused by the lecturer request flow (Phase 5), the admin
// approval/override flow (Phase 6) and the generator's self-audit (Phase 7).

export const BLOCKING_STATUSES = ["approved", "pending"] as const;

export async function loadSettings(db: DB = prisma): Promise<Settings> {
  const s = await db.setting.findFirst();
  return {
    dayStartTime: s?.dayStartTime ?? "08:00",
    dayEndTime: s?.dayEndTime ?? "18:00",
    slotDurationMinutes: s?.slotDurationMinutes ?? 60,
    workingDays: s ? safeDays(s.workingDays) : ["mon", "tue", "wed", "thu", "fri"],
    maxWeeklyHoursPerLecturer: s?.maxWeeklyHoursPerLecturer ?? 18,
  };
}

function safeDays(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Load the occupying allocations for a session, shaped for the core checker. */
export async function loadExisting(
  sessionId: number,
  statuses: readonly string[] = BLOCKING_STATUSES,
  db: DB = prisma,
): Promise<ExistingAllocation[]> {
  const rows = await db.allocation.findMany({
    where: { sessionId, status: { in: statuses as string[] } },
    include: {
      course: { select: { code: true, title: true, departmentId: true, level: true } },
      lecturer: { select: { name: true } },
      venue: { select: { name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    courseId: r.courseId,
    courseCode: r.course.code,
    courseTitle: r.course.title,
    departmentId: r.course.departmentId,
    level: r.course.level,
    lecturerId: r.lecturerId,
    lecturerName: r.lecturer.name,
    venueId: r.venueId,
    venueName: r.venue.name,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
  }));
}

export async function loadVenues(db: DB = prisma): Promise<VenueInfo[]> {
  const venues = await db.venue.findMany({ select: { id: true, name: true, capacity: true } });
  return venues;
}

/** Approved teaching minutes already scheduled for a lecturer this session/week. */
export async function lecturerWeeklyMinutes(
  sessionId: number,
  lecturerId: number,
  excludeAllocationId?: number,
  db: DB = prisma,
): Promise<number> {
  const rows = await db.allocation.findMany({
    where: {
      sessionId,
      lecturerId,
      status: { in: ["approved", "pending"] },
      ...(excludeAllocationId ? { id: { not: excludeAllocationId } } : {}),
    },
    select: { startTime: true, endTime: true },
  });
  return rows.reduce((sum, r) => sum + durationMinutes(r.startTime, r.endTime), 0);
}

/**
 * The public entry point mirrored on the client via /api/conflict-check.
 * Loads state for the request's session and returns the full conflict result.
 */
export async function checkAllocation(request: SlotRequest, db: DB = prisma): Promise<ConflictResult> {
  const course = await db.course.findUnique({
    where: { id: request.courseId },
    select: { id: true, code: true, title: true, departmentId: true, level: true, expectedStudents: true },
  });
  if (!course) {
    return { ok: false, conflicts: [{ type: "policy", message: "Course not found." }], warnings: [], suggestions: [] };
  }

  const [settings, existing, venues, weekly] = await Promise.all([
    loadSettings(db),
    loadExisting(request.sessionId, BLOCKING_STATUSES, db),
    loadVenues(db),
    lecturerWeeklyMinutes(request.sessionId, request.lecturerId, request.excludeAllocationId, db),
  ]);

  return checkConflicts({
    request,
    course: course as CourseInfo,
    existing,
    venues,
    settings,
    lecturerWeeklyMinutes: weekly,
  });
}
