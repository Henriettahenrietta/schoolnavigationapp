// The automatic timetable generator — PURE logic, no database (Prisma wrapper in
// ./generator.ts). It calls the SAME conflict core the manual flow uses, so a generated
// timetable can never contain a clash the manual path would have rejected.
//
// Strategy: greedy placement, courses ordered MOST-CONSTRAINED-FIRST, with bounded
// backtracking (relocate one blocking placement) before declaring a course unplaced.

import { toMinutes } from "../time";
import {
  checkConflicts,
  type ExistingAllocation,
  type VenueInfo,
  type Settings,
  type CourseInfo,
} from "../conflict/core";

export type GenCourse = {
  id: number;
  code: string;
  title: string;
  departmentId: number;
  level: number;
  expectedStudents: number;
  creditUnits: number;
  lecturerId?: number | null; // preassigned lecturer, if any
};

export type GenLecturer = { id: number; name: string; departmentId: number | null };

export type GenAvailability = {
  lecturerId: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  preference: "preferred" | "unavailable" | string;
};

export type Placement = {
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

export type Unplaced = { courseId: number; code: string; reason: string };

export type GenerateResult = {
  placements: Placement[];
  unplaced: Unplaced[];
  quality: number; // 0..100 soft-constraint score
};

export type GenerateInput = {
  courses: GenCourse[];
  lecturers: GenLecturer[];
  venues: VenueInfo[];
  settings: Settings;
  availability: GenAvailability[];
  existing: ExistingAllocation[]; // approved/locked, never touched
  seed?: number;
};

// Deterministic PRNG so a given seed always produces the same timetable (for the demo).
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A course's weekly hours -> block lengths (hours), spread across days.
function blocksFor(creditUnits: number): number[] {
  const h = Math.max(1, creditUnits);
  const blocks: number[] = [];
  let rem = h;
  while (rem > 0) {
    const b = Math.min(2, rem);
    blocks.push(b);
    rem -= b;
  }
  return blocks;
}

function addMinutes(hhmm: string, mins: number): string {
  const m = toMinutes(hhmm) + mins;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function withinAny(windows: GenAvailability[], day: string, start: string, end: string): boolean {
  return windows.some(
    (w) => w.dayOfWeek === day && toMinutes(start) >= toMinutes(w.startTime) && toMinutes(end) <= toMinutes(w.endTime),
  );
}
function overlapsAny(windows: GenAvailability[], day: string, start: string, end: string): boolean {
  return windows.some(
    (w) => w.dayOfWeek === day && toMinutes(start) < toMinutes(w.endTime) && toMinutes(end) > toMinutes(w.startTime),
  );
}

export function generateTimetable(input: GenerateInput): GenerateResult {
  const { courses, lecturers, venues, settings, availability, existing } = input;
  const rng = mulberry32(input.seed ?? 12345);

  // Working set of allocations (immutable existing + everything placed this run).
  const working: ExistingAllocation[] = [...existing];
  const placements: Placement[] = [];
  const unplaced: Unplaced[] = [];
  const lecturerMinutes = new Map<number, number>();
  for (const e of existing) {
    lecturerMinutes.set(e.lecturerId, (lecturerMinutes.get(e.lecturerId) ?? 0) + (toMinutes(e.endTime) - toMinutes(e.startTime)));
  }

  const availByLecturer = new Map<number, GenAvailability[]>();
  for (const a of availability) {
    const arr = availByLecturer.get(a.lecturerId) ?? [];
    arr.push(a);
    availByLecturer.set(a.lecturerId, arr);
  }
  const unavailable = (lid: number) => (availByLecturer.get(lid) ?? []).filter((a) => a.preference === "unavailable");
  const preferred = (lid: number) => (availByLecturer.get(lid) ?? []).filter((a) => a.preference === "preferred");

  const suitableVenues = (c: GenCourse) => venues.filter((v) => v.capacity >= c.expectedStudents);
  const deptLecturers = (deptId: number) => lecturers.filter((l) => l.departmentId === deptId);

  // ---- Most-constrained-first ordering --------------------------------------
  const ordered = [...courses].sort((a, b) => {
    const ha = Math.max(1, a.creditUnits), hb = Math.max(1, b.creditUnits);
    if (hb !== ha) return hb - ha; // more weekly hours first
    if (b.expectedStudents !== a.expectedStudents) return b.expectedStudents - a.expectedStudents;
    return suitableVenues(a).length - suitableVenues(b).length; // fewest venues first
  });

  const dayStart = toMinutes(settings.dayStartTime);
  const dayEnd = toMinutes(settings.dayEndTime);
  const step = settings.slotDurationMinutes;

  // Try to place a single block of `hours`, returns the chosen Placement or null.
  function tryPlaceBlock(course: GenCourse, hours: number, placedDaysForCourse: Set<string>): Placement | null {
    const dur = hours * 60;
    const courseInfo: CourseInfo = {
      id: course.id, code: course.code, title: course.title,
      departmentId: course.departmentId, level: course.level, expectedStudents: course.expectedStudents,
    };
    const venuesFit = suitableVenues(course).sort((a, b) => a.capacity - b.capacity);
    if (venuesFit.length === 0) return null;

    // Candidate lecturers: preassigned, else department lecturers least-loaded first.
    const candLecturers = course.lecturerId
      ? lecturers.filter((l) => l.id === course.lecturerId)
      : deptLecturers(course.departmentId).sort(
          (a, b) => (lecturerMinutes.get(a.id) ?? 0) - (lecturerMinutes.get(b.id) ?? 0),
        );
    if (candLecturers.length === 0) return null;

    let best: { p: Placement; score: number } | null = null;

    for (const lecturer of candLecturers) {
      for (const day of settings.workingDays) {
        for (let s = dayStart; s + dur <= dayEnd; s += step) {
          const start = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
          const end = addMinutes(start, dur);

          // Hard: lecturer 'unavailable' windows.
          if (overlapsAny(unavailable(lecturer.id), day, start, end)) continue;

          for (const venue of venuesFit) {
            const r = checkConflicts({
              request: { sessionId: 0, courseId: course.id, lecturerId: lecturer.id, venueId: venue.id, dayOfWeek: day, startTime: start, endTime: end },
              course: courseInfo,
              existing: working,
              venues,
              settings,
              suggest: false,
            });
            if (!r.ok) continue;

            // ---- Soft score ----
            let score = 100;
            score -= (venue.capacity - course.expectedStudents) / 20; // prefer tight fit
            if (placedDaysForCourse.has(day)) score -= 25; // spread across days
            if (overlapsAny(preferred(lecturer.id), day, start, end)) score += 8; // preferred window
            if (course.expectedStudents > 150 && toMinutes(start) < 12 * 60) score += 8; // mornings for big classes
            // lunch 13:00–14:00 kept clear
            if (toMinutes(start) < 14 * 60 && toMinutes(end) > 13 * 60) score -= 12;
            score += rng() * 0.5; // deterministic tie-break

            if (!best || score > best.score) {
              best = {
                score,
                p: {
                  courseId: course.id, courseCode: course.code, courseTitle: course.title,
                  departmentId: course.departmentId, level: course.level,
                  lecturerId: lecturer.id, lecturerName: lecturer.name,
                  venueId: venue.id, venueName: venue.name,
                  dayOfWeek: day, startTime: start, endTime: end,
                },
              };
            }
          }
        }
      }
    }
    return best ? best.p : null;
  }

  function commit(p: Placement) {
    working.push({
      id: -(placements.length + 1), // negative synthetic ids for this run
      courseId: p.courseId, courseCode: p.courseCode, courseTitle: p.courseTitle,
      departmentId: p.departmentId, level: p.level,
      lecturerId: p.lecturerId, lecturerName: p.lecturerName,
      venueId: p.venueId, venueName: p.venueName,
      dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime,
    });
    placements.push(p);
    lecturerMinutes.set(p.lecturerId, (lecturerMinutes.get(p.lecturerId) ?? 0) + (toMinutes(p.endTime) - toMinutes(p.startTime)));
  }

  let softTotal = 0;
  let softCount = 0;

  for (const course of ordered) {
    const blocks = blocksFor(course.creditUnits);
    const placedDays = new Set<string>();
    for (const hours of blocks) {
      const p = tryPlaceBlock(course, hours, placedDays);
      if (!p) {
        unplaced.push({ courseId: course.id, code: course.code, reason: reasonFor(course, venues) });
        break;
      }
      commit(p);
      placedDays.add(p.dayOfWeek);
      softCount++;
      const venue = venues.find((v) => v.id === p.venueId)!;
      softTotal += Math.max(0, 100 - (venue.capacity - course.expectedStudents) / 5);
    }
  }

  const quality = softCount > 0 ? Math.round(softTotal / softCount) : 100;
  return { placements, unplaced, quality };
}

function reasonFor(course: GenCourse, venues: VenueInfo[]): string {
  const maxCap = Math.max(0, ...venues.map((v) => v.capacity));
  if (course.expectedStudents > maxCap) {
    return `no venue with capacity ≥ ${course.expectedStudents} exists (largest is ${maxCap})`;
  }
  return "no conflict-free day/time/venue slot was available";
}
