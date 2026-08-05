// The conflict engine — PURE logic, no database. Both the live request flow and the
// automatic generator run through these exact functions, so manual submissions and
// generated placements can never disagree. The Prisma-backed wrapper is in ./checker.ts.

import { toMinutes, overlaps, durationMinutes } from "../time";
import type { Day } from "../constants";

export type ConflictType = "class" | "lecturer" | "venue" | "duplicate" | "policy";

export type Conflict = {
  type: ConflictType;
  message: string;
};

export type FreeSlot = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venueId: number;
  venueName: string;
};

export type ConflictResult = {
  ok: boolean;
  conflicts: Conflict[]; // hard blockers
  warnings: string[]; // soft (admin may still approve)
  suggestions: FreeSlot[];
};

// The slot being requested/placed.
export type SlotRequest = {
  sessionId: number;
  courseId: number;
  lecturerId: number;
  venueId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  /** When editing/relocating, ignore this existing allocation id. */
  excludeAllocationId?: number;
};

// An allocation already occupying the timetable (status approved or pending).
export type ExistingAllocation = {
  id: number;
  courseId: number;
  courseCode: string;
  courseTitle: string;
  departmentId: number;
  level: number;
  lecturerId: number;
  lecturerName: string;
  venueId: number;
  venueName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
};

export type CourseInfo = {
  id: number;
  code: string;
  title: string;
  departmentId: number;
  level: number;
  expectedStudents: number;
};

export type VenueInfo = { id: number; name: string; capacity: number };

export type Settings = {
  dayStartTime: string;
  dayEndTime: string;
  slotDurationMinutes: number;
  workingDays: string[];
  maxWeeklyHoursPerLecturer: number;
};

const DAY_ABBR: Record<string, string> = {
  mon: "MON",
  tue: "TUE",
  wed: "WED",
  thu: "THU",
  fri: "FRI",
  sat: "SAT",
};

function fmt(day: string, start: string, end: string): string {
  return `${DAY_ABBR[day] ?? day.toUpperCase()} ${start}–${end}`;
}

/**
 * Core conflict check. Returns hard conflicts (blocking) and soft warnings, plus up to 5
 * suggested free slots when blocked.
 *
 * Checks run in the order the spec requires: class, lecturer, venue, then policy.
 */
export function checkConflicts(args: {
  request: SlotRequest;
  course: CourseInfo;
  existing: ExistingAllocation[];
  venues: VenueInfo[];
  settings: Settings;
  lecturerWeeklyMinutes?: number; // already-approved minutes this week for the lecturer
  suggest?: boolean;
}): ConflictResult {
  const { request, course, existing, venues, settings } = args;
  const conflicts: Conflict[] = [];
  const warnings: string[] = [];

  // ---- Policy / rule checks (some hard, some soft) --------------------------
  const start = request.startTime;
  const end = request.endTime;

  if (toMinutes(end) <= toMinutes(start)) {
    conflicts.push({ type: "policy", message: "End time must be after start time." });
  }
  if (!settings.workingDays.includes(request.dayOfWeek)) {
    conflicts.push({
      type: "policy",
      message: `${DAY_ABBR[request.dayOfWeek] ?? request.dayOfWeek} is not a working day.`,
    });
  }
  if (toMinutes(start) < toMinutes(settings.dayStartTime) || toMinutes(end) > toMinutes(settings.dayEndTime)) {
    conflicts.push({
      type: "policy",
      message: `Slot must fall within the teaching day (${settings.dayStartTime}–${settings.dayEndTime}).`,
    });
  }
  const dur = durationMinutes(start, end);
  if (dur > 0 && dur % settings.slotDurationMinutes !== 0) {
    conflicts.push({
      type: "policy",
      message: `Duration must be a multiple of ${settings.slotDurationMinutes} minutes.`,
    });
  }

  // Only compare within the same session, same day, overlapping, excluding self.
  const clashing = existing.filter(
    (e) =>
      e.id !== request.excludeAllocationId &&
      e.dayOfWeek === request.dayOfWeek &&
      overlaps(start, end, e.startTime, e.endTime),
  );

  // ---- 1. Class / student-group conflict -----------------------------------
  for (const e of clashing) {
    if (e.departmentId === course.departmentId && e.level === course.level && e.courseId !== course.id) {
      conflicts.push({
        type: "class",
        message: `Declined: ${fmt(e.dayOfWeek, e.startTime, e.endTime)} is already allocated to ${e.courseCode} (${e.courseTitle}) taught by ${e.lecturerName} in ${e.venueName} for ${course.level} Level.`,
      });
    }
  }

  // ---- 2. Lecturer conflict -------------------------------------------------
  for (const e of clashing) {
    if (e.lecturerId === request.lecturerId) {
      conflicts.push({
        type: "lecturer",
        message: `Declined: this lecturer already teaches ${e.courseCode} on ${fmt(e.dayOfWeek, e.startTime, e.endTime)} in ${e.venueName}.`,
      });
    }
  }

  // ---- 3. Venue conflict (department-scoped) --------------------------------
  // A venue clash only blocks when the occupying class is in the SAME department, so two
  // different departments may run at the same time. (Same lecturer is still blocked below,
  // since one person cannot be in two places at once.)
  for (const e of clashing) {
    if (e.venueId === request.venueId && e.departmentId === course.departmentId) {
      const free = freeVenuesAt(request, existing, venues, course)
        .map((v) => v.name)
        .slice(0, 4);
      const freeMsg = free.length ? ` Free venues at that time: ${free.join(", ")}.` : "";
      conflicts.push({
        type: "venue",
        message: `Declined: ${e.venueName} is occupied by ${e.courseCode} (${e.lecturerName}) on ${fmt(e.dayOfWeek, e.startTime, e.endTime)}.${freeMsg}`,
      });
    }
  }

  // ---- 4. Duplicate: same course already placed at an overlapping time ------
  for (const e of clashing) {
    if (e.courseId === course.id) {
      conflicts.push({
        type: "duplicate",
        message: `Declined: ${course.code} already has an allocation on ${fmt(e.dayOfWeek, e.startTime, e.endTime)}.`,
      });
    }
  }

  // ---- Soft warnings (admin can still approve) ------------------------------
  const venue = venues.find((v) => v.id === request.venueId);
  if (venue && venue.capacity < course.expectedStudents) {
    warnings.push(
      `Venue ${venue.name} holds ${venue.capacity} but ${course.code} expects ${course.expectedStudents} students.`,
    );
  }
  if (args.lecturerWeeklyMinutes != null) {
    const projected = (args.lecturerWeeklyMinutes + dur) / 60;
    if (projected > settings.maxWeeklyHoursPerLecturer) {
      warnings.push(
        `This lecturer would teach ${projected.toFixed(1)}h this week, above the ${settings.maxWeeklyHoursPerLecturer}h limit.`,
      );
    }
  }

  const ok = conflicts.length === 0;
  const suggestions =
    !ok && args.suggest !== false
      ? findFreeSlots({ request, course, existing, venues, settings, limit: 5 })
      : [];

  return { ok, conflicts, warnings, suggestions };
}

/** Venues with no overlapping allocation at the requested day/time and enough capacity. */
export function freeVenuesAt(
  request: SlotRequest,
  existing: ExistingAllocation[],
  venues: VenueInfo[],
  course: CourseInfo,
): VenueInfo[] {
  const occupied = new Set(
    existing
      .filter(
        (e) =>
          e.id !== request.excludeAllocationId &&
          e.dayOfWeek === request.dayOfWeek &&
          e.departmentId === course.departmentId && // venue only "occupied" for the same department
          overlaps(request.startTime, request.endTime, e.startTime, e.endTime),
      )
      .map((e) => e.venueId),
  );
  return venues
    .filter((v) => !occupied.has(v.id) && v.capacity >= course.expectedStudents)
    .sort((a, b) => a.capacity - b.capacity);
}

/**
 * Nearest free slots that clear ALL four checks — scans the candidate slot pool built from
 * settings, keeping the same slot duration as the request.
 */
export function findFreeSlots(args: {
  request: SlotRequest;
  course: CourseInfo;
  existing: ExistingAllocation[];
  venues: VenueInfo[];
  settings: Settings;
  limit: number;
}): FreeSlot[] {
  const { request, course, existing, venues, settings, limit } = args;
  const dur = durationMinutes(request.startTime, request.endTime);
  if (dur <= 0) return [];

  const dayStart = toMinutes(settings.dayStartTime);
  const dayEnd = toMinutes(settings.dayEndTime);
  const step = settings.slotDurationMinutes;
  const out: FreeSlot[] = [];

  for (const day of settings.workingDays) {
    for (let s = dayStart; s + dur <= dayEnd; s += step) {
      const startStr = minToStr(s);
      const endStr = minToStr(s + dur);
      // Candidate must pass class + lecturer checks and have at least one free suitable venue.
      const cand: SlotRequest = { ...request, dayOfWeek: day, startTime: startStr, endTime: endStr };
      const dayClashes = existing.filter(
        (e) => e.id !== request.excludeAllocationId && e.dayOfWeek === day && overlaps(startStr, endStr, e.startTime, e.endTime),
      );
      const classClash = dayClashes.some(
        (e) => e.departmentId === course.departmentId && e.level === course.level && e.courseId !== course.id,
      );
      const lecturerClash = dayClashes.some((e) => e.lecturerId === request.lecturerId);
      if (classClash || lecturerClash) continue;
      const free = freeVenuesAt(cand, existing, venues, course);
      if (free.length === 0) continue;
      out.push({ dayOfWeek: day, startTime: startStr, endTime: endStr, venueId: free[0].id, venueName: free[0].name });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

function minToStr(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export type { Day };
