import { prisma } from "../prisma";
import { loadSettings, loadVenues } from "../conflict/checker";
import { checkConflicts, type ExistingAllocation } from "../conflict/core";
import { generateTimetable, type GenCourse, type GenLecturer, type GenAvailability } from "./core";

export type GenerationReport = {
  runId: number;
  mode: string;
  coursesTotal: number;
  coursesPlaced: number;
  coursesUnplaced: number;
  quality: number;
  runtimeMs: number;
  unplaced: { courseId: number; code: string; reason: string }[];
  selfAuditConflicts: number;
};

function toExisting(rows: any[]): ExistingAllocation[] {
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

/**
 * Run the automatic generator for a session and persist the result as a DRAFT run.
 * FILL  - place only courses with no approved allocation (existing kept as constraints).
 * FULL  - rebuild everything except locked allocations (only locked kept as constraints).
 *
 * `departmentId` narrows the courses the run may PLACE to a single department, which is
 * how a HOD regenerates their own timetable. Allocations from every other department are
 * still loaded as constraints, so a departmental run can never double-book a shared venue
 * or a lecturer who also teaches elsewhere.
 */
export async function runGeneration(
  sessionId: number,
  opts: { mode: "fill" | "full"; seed?: number; runById: number; departmentId?: number },
): Promise<GenerationReport> {
  const started = Date.now();
  const [settings, venues, courses, allAllocs, lecturers, availabilityRows] = await Promise.all([
    loadSettings(),
    loadVenues(),
    prisma.course.findMany({ where: { sessionId } }),
    prisma.allocation.findMany({
      where: { sessionId },
      include: { course: true, lecturer: { select: { name: true } }, venue: { select: { name: true } } },
    }),
    prisma.user.findMany({ where: { role: "lecturer" }, select: { id: true, name: true, departmentId: true } }),
    prisma.lecturerAvailability.findMany(),
  ]);

  const approvedCourseIds = new Set(allAllocs.filter((a) => a.status === "approved").map((a) => a.courseId));
  const lockedCourseIds = new Set(allAllocs.filter((a) => a.isLocked).map((a) => a.courseId));

  const scoped = opts.departmentId != null;
  // A course is in scope for placement only if it belongs to the target department.
  const inScope = (c: { departmentId: number }) => !scoped || c.departmentId === opts.departmentId;

  let constraints: any[];
  let toPlace: typeof courses;
  if (opts.mode === "full") {
    // In a scoped run, other departments' classes stay put and act as constraints even
    // though they are not locked, so "rebuild all" means "rebuild all of MY department".
    constraints = allAllocs.filter((a) => a.isLocked || (scoped && !inScope(a.course)));
    toPlace = courses.filter((c) => !lockedCourseIds.has(c.id) && inScope(c));
  } else {
    constraints = allAllocs.filter((a) => a.status === "approved" || a.status === "pending");
    toPlace = courses.filter((c) => !approvedCourseIds.has(c.id) && inScope(c));
  }

  const genCourses: GenCourse[] = toPlace.map((c) => ({
    id: c.id, code: c.code, title: c.title,
    departmentId: c.departmentId, level: c.level,
    expectedStudents: c.expectedStudents, creditUnits: c.creditUnits, lecturerId: null,
  }));
  const genLecturers: GenLecturer[] = lecturers.map((l) => ({ id: l.id, name: l.name, departmentId: l.departmentId }));
  const availability: GenAvailability[] = availabilityRows.map((a) => ({
    lecturerId: a.lecturerId, dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime, preference: a.preference,
  }));

  const result = generateTimetable({
    courses: genCourses,
    lecturers: genLecturers,
    venues,
    settings,
    availability,
    existing: toExisting(constraints),
    seed: opts.seed,
  });

  // ---- Self-audit: re-check every placement against the others + constraints ----
  const auditExisting = [...toExisting(constraints)];
  let selfAuditConflicts = 0;
  for (const p of result.placements) {
    const r = checkConflicts({
      request: { sessionId, courseId: p.courseId, lecturerId: p.lecturerId, venueId: p.venueId, dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime },
      course: { id: p.courseId, code: p.courseCode, title: p.courseTitle, departmentId: p.departmentId, level: p.level, expectedStudents: 0 },
      existing: auditExisting,
      venues,
      settings,
      suggest: false,
    });
    if (!r.ok) selfAuditConflicts++;
    auditExisting.push({
      id: -(auditExisting.length + 1), courseId: p.courseId, courseCode: p.courseCode, courseTitle: p.courseTitle,
      departmentId: p.departmentId, level: p.level, lecturerId: p.lecturerId, lecturerName: p.lecturerName,
      venueId: p.venueId, venueName: p.venueName, dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime,
    });
  }

  const runtimeMs = Date.now() - started;
  const placedCourseIds = new Set(result.placements.map((p) => p.courseId));

  // ---- Persist as a draft run (replacing any prior draft run for this session) ----
  // Prisma's 5s default interactive-transaction timeout is not enough against a remote
  // (Neon) database: superseding prior drafts plus a bulk createMany of every placement
  // is several round-trips, and a slow link blows the budget mid-write.
  const run = await prisma.$transaction(async (tx) => {
    // Only supersede drafts from the same scope: a HOD regenerating Computer Science must
    // not discard Marketing's pending draft, nor the admin's institution-wide one.
    const priorDrafts = await tx.generationRun.findMany({
      where: { sessionId, status: "draft", departmentId: opts.departmentId ?? null },
    });
    for (const pr of priorDrafts) {
      await tx.allocation.deleteMany({ where: { generationRunId: pr.id, status: "draft" } });
      await tx.generationRun.update({ where: { id: pr.id }, data: { status: "discarded" } });
    }

    const created = await tx.generationRun.create({
      data: {
        sessionId, runById: opts.runById, departmentId: opts.departmentId ?? null,
        mode: opts.mode, randomSeed: opts.seed ?? null,
        coursesTotal: genCourses.length, coursesPlaced: placedCourseIds.size, coursesUnplaced: result.unplaced.length,
        qualityScore: result.quality, runtimeMs, status: "draft",
        unplacedReport: JSON.stringify(result.unplaced),
      },
    });

    if (result.placements.length > 0) {
      await tx.allocation.createMany({
        data: result.placements.map((p) => ({
          sessionId, courseId: p.courseId, lecturerId: p.lecturerId, venueId: p.venueId,
          dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime,
          status: "draft", source: "auto", generationRunId: created.id,
        })),
      });
    }
    return created;
  }, { timeout: 30_000, maxWait: 15_000 });

  return {
    runId: run.id, mode: opts.mode,
    coursesTotal: genCourses.length, coursesPlaced: placedCourseIds.size, coursesUnplaced: result.unplaced.length,
    quality: result.quality, runtimeMs, unplaced: result.unplaced, selfAuditConflicts,
  };
}
