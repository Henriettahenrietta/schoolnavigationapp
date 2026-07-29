// Automated tests for the timetable generator core. Run with: npm run test
import assert from "node:assert";
import { generateTimetable, type GenerateInput } from "../lib/generator/core";
import { checkConflicts, type ExistingAllocation, type VenueInfo, type Settings } from "../lib/conflict/core";

let passed = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  ✗ ${name}\n      ${e.message}`);
  }
}

const settings: Settings = {
  dayStartTime: "08:00", dayEndTime: "18:00", slotDurationMinutes: 60,
  workingDays: ["mon", "tue", "wed", "thu", "fri"], maxWeeklyHoursPerLecturer: 18,
};
const venues: VenueInfo[] = [
  { id: 1, name: "LT1", capacity: 300 },
  { id: 2, name: "LT2", capacity: 250 },
  { id: 3, name: "Lab1", capacity: 60 },
];
const lecturers = [
  { id: 1, name: "L1", departmentId: 1 },
  { id: 2, name: "L2", departmentId: 1 },
  { id: 3, name: "L3", departmentId: 2 },
];
const courses = [
  { id: 101, code: "CSC101", title: "Intro", departmentId: 1, level: 100, expectedStudents: 200, creditUnits: 2 },
  { id: 102, code: "CSC201", title: "Data", departmentId: 1, level: 200, expectedStudents: 150, creditUnits: 2 },
  { id: 103, code: "PHY101", title: "Mech", departmentId: 2, level: 100, expectedStudents: 40, creditUnits: 2 },
  { id: 104, code: "BIG500", title: "Huge", departmentId: 1, level: 300, expectedStudents: 500, creditUnits: 2 },
];
// A locked allocation that must never be touched or clashed with.
const locked: ExistingAllocation = {
  id: 9000, courseId: 900, courseCode: "LOCK", courseTitle: "Locked", departmentId: 1, level: 400,
  lecturerId: 1, lecturerName: "L1", venueId: 1, venueName: "LT1", dayOfWeek: "mon", startTime: "10:00", endTime: "12:00",
};

function makeInput(seed?: number): GenerateInput {
  return { courses, lecturers, venues, settings, availability: [], existing: [locked], seed };
}

console.log("\nTimetable generator");

test("(a) a full run produces ZERO conflicts when re-checked", () => {
  const res = generateTimetable(makeInput(42));
  const acc: ExistingAllocation[] = [locked];
  for (const p of res.placements) {
    const r = checkConflicts({
      request: { sessionId: 0, courseId: p.courseId, lecturerId: p.lecturerId, venueId: p.venueId, dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime },
      course: { id: p.courseId, code: p.courseCode, title: p.courseTitle, departmentId: p.departmentId, level: p.level, expectedStudents: 0 },
      existing: acc, venues, settings, suggest: false,
    });
    assert.ok(r.ok, `placement ${p.courseCode} ${p.dayOfWeek} ${p.startTime} conflicts: ${r.conflicts[0]?.message}`);
    acc.push({ ...locked, id: -acc.length, courseId: p.courseId, courseCode: p.courseCode, departmentId: p.departmentId, level: p.level, lecturerId: p.lecturerId, venueId: p.venueId, venueName: p.venueName, dayOfWeek: p.dayOfWeek, startTime: p.startTime, endTime: p.endTime });
  }
  assert.ok(res.placements.length > 0);
});

test("(b) the same seed produces an identical timetable twice", () => {
  const a = generateTimetable(makeInput(7));
  const b = generateTimetable(makeInput(7));
  const norm = (r: typeof a) =>
    JSON.stringify(r.placements.map((p) => [p.courseId, p.dayOfWeek, p.startTime, p.venueId, p.lecturerId]).sort());
  assert.equal(norm(a), norm(b));
});

test("(c) locked allocations are never moved or clashed with", () => {
  const res = generateTimetable(makeInput(42));
  // No placement occupies the locked slot (MON 10:00–12:00 in LT1).
  const touchesLocked = res.placements.some(
    (p) => p.dayOfWeek === "mon" && p.venueId === 1 && p.startTime < "12:00" && p.endTime > "10:00",
  );
  assert.ok(!touchesLocked, "a placement overlapped the locked slot");
});

test("(d) an impossible course (needs a 500-seat hall) is reported unplaced with a reason", () => {
  const res = generateTimetable(makeInput(42));
  const big = res.unplaced.find((u) => u.code === "BIG500");
  assert.ok(big, "BIG500 should be unplaced");
  assert.match(big!.reason, /capacity/i);
  // ...and it was NOT placed illegally.
  assert.ok(!res.placements.some((p) => p.courseId === 104));
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
