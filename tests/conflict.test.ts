// Automated tests for the conflict engine. Run with: npm run test
// (A tiny zero-dependency harness — no test framework needed.)
import assert from "node:assert";
import { checkConflicts, findFreeSlots, type ExistingAllocation, type CourseInfo, type VenueInfo, type Settings, type SlotRequest } from "../lib/conflict/core";
import { BLOCKING_STATUSES } from "../lib/conflict/checker";
import { overlaps } from "../lib/time";

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

// ---- Fixtures ---------------------------------------------------------------
const settings: Settings = {
  dayStartTime: "08:00",
  dayEndTime: "18:00",
  slotDurationMinutes: 60,
  workingDays: ["mon", "tue", "wed", "thu", "fri"],
  maxWeeklyHoursPerLecturer: 18,
};
const venues: VenueInfo[] = [
  { id: 1, name: "LT1", capacity: 300 },
  { id: 2, name: "LT2", capacity: 250 },
  { id: 3, name: "Lab1", capacity: 60 },
];
const course: CourseInfo = { id: 10, code: "CSC301", title: "Data Structures", departmentId: 1, level: 300, expectedStudents: 90 };

// A CSC 300-level class on MON 10:00–12:00 in LT2 by lecturer 5.
const classOccupant: ExistingAllocation = {
  id: 100, courseId: 11, courseCode: "CSC305", courseTitle: "Operating Systems",
  departmentId: 1, level: 300, lecturerId: 5, lecturerName: "Dr. Ada",
  venueId: 2, venueName: "LT2", dayOfWeek: "mon", startTime: "10:00", endTime: "12:00",
};
const base: SlotRequest = { sessionId: 1, courseId: 10, lecturerId: 9, venueId: 1, dayOfWeek: "mon", startTime: "10:00", endTime: "12:00" };

function run(req: Partial<SlotRequest>, existing: ExistingAllocation[]) {
  return checkConflicts({ request: { ...base, ...req }, course, existing, venues, settings });
}

console.log("\nInterval-overlap rule");
test("exact same slot overlaps", () => assert.equal(overlaps("10:00", "12:00", "10:00", "12:00"), true));
test("partial overlap at start", () => assert.equal(overlaps("09:00", "11:00", "10:00", "12:00"), true));
test("partial overlap at end", () => assert.equal(overlaps("11:00", "13:00", "10:00", "12:00"), true));
test("fully contained overlaps", () => assert.equal(overlaps("10:30", "11:00", "10:00", "12:00"), true));
test("adjacent slots do NOT overlap (08–10 vs 10–12)", () => assert.equal(overlaps("08:00", "10:00", "10:00", "12:00"), false));

console.log("\nClass / student-group conflict (same dept + level)");
test("exact same slot is a class clash", () => {
  const r = run({}, [classOccupant]);
  assert.equal(r.ok, false);
  assert.ok(r.conflicts.some((c) => c.type === "class"));
});
test("partial overlap at start clashes", () => assert.equal(run({ startTime: "09:00", endTime: "11:00" }, [classOccupant]).ok, false));
test("partial overlap at end clashes", () => assert.equal(run({ startTime: "11:00", endTime: "13:00" }, [classOccupant]).ok, false));
test("adjacent slot does NOT clash", () => assert.equal(run({ startTime: "08:00", endTime: "10:00" }, [classOccupant]).ok, true));
test("different day does NOT clash", () => assert.equal(run({ dayOfWeek: "tue" }, [classOccupant]).ok, true));

console.log("\nLecturer conflict");
test("same lecturer double-booked is a lecturer clash", () => {
  const occ: ExistingAllocation = { ...classOccupant, departmentId: 2, level: 200, lecturerId: 9, venueId: 3, venueName: "Lab1" };
  const r = run({ lecturerId: 9, venueId: 1 }, [occ]);
  assert.ok(r.conflicts.some((c) => c.type === "lecturer"));
});

console.log("\nVenue conflict (department-scoped)");
test("same venue occupied by the SAME department is a venue clash", () => {
  // same department (1), different level -> isolates venue conflict from class conflict
  const occ: ExistingAllocation = { ...classOccupant, departmentId: 1, level: 200, lecturerId: 7, venueId: 1, venueName: "LT1" };
  const r = run({ venueId: 1, lecturerId: 9 }, [occ]);
  assert.ok(r.conflicts.some((c) => c.type === "venue"));
  assert.ok(/Free venues/.test(r.conflicts.find((c) => c.type === "venue")!.message));
});
test("same venue used by a DIFFERENT department at the same time does NOT clash", () => {
  const occ: ExistingAllocation = { ...classOccupant, departmentId: 2, level: 200, lecturerId: 7, venueId: 1, venueName: "LT1" };
  const r = run({ venueId: 1, lecturerId: 9 }, [occ]);
  assert.equal(r.ok, true);
});
test("but the SAME lecturer at the same time still clashes, even across departments", () => {
  const occ: ExistingAllocation = { ...classOccupant, departmentId: 2, level: 200, lecturerId: 9, venueId: 3, venueName: "Lab1" };
  const r = run({ lecturerId: 9, venueId: 1 }, [occ]);
  assert.ok(r.conflicts.some((c) => c.type === "lecturer"));
});

console.log("\nDuplicate (same course overlapping)");
test("same course at overlapping time is flagged duplicate not class", () => {
  const occ: ExistingAllocation = { ...classOccupant, courseId: 10, courseCode: "CSC301" };
  const r = run({ courseId: 10, venueId: 3, lecturerId: 9 }, [occ]);
  assert.ok(r.conflicts.some((c) => c.type === "duplicate"));
  assert.ok(!r.conflicts.some((c) => c.type === "class"));
});

console.log("\nCancelled / non-blocking statuses");
test("BLOCKING_STATUSES excludes cancelled, declined and draft", () => {
  assert.deepEqual([...BLOCKING_STATUSES], ["approved", "pending"]);
  assert.ok(!(BLOCKING_STATUSES as readonly string[]).includes("cancelled"));
});
test("a timetable with no blocking allocations passes", () => assert.equal(run({}, []).ok, true));

console.log("\nPolicy / rule violations");
test("outside the teaching day is blocked", () => {
  const r = run({ dayOfWeek: "tue", startTime: "07:00", endTime: "09:00" }, []);
  assert.ok(r.conflicts.some((c) => c.type === "policy"));
});
test("end before start is blocked", () => {
  const r = run({ dayOfWeek: "tue", startTime: "12:00", endTime: "10:00" }, []);
  assert.ok(r.conflicts.some((c) => c.type === "policy"));
});
test("duration not a multiple of the slot length is blocked", () => {
  const r = run({ dayOfWeek: "tue", startTime: "10:00", endTime: "10:30" }, []);
  assert.ok(r.conflicts.some((c) => c.type === "policy"));
});

console.log("\nSoft warnings & suggestions");
test("undersized venue is a warning, not a block", () => {
  const r = run({ dayOfWeek: "tue", venueId: 3 }, []); // Lab1 cap 60 < 90 expected
  assert.equal(r.ok, true);
  assert.ok(r.warnings.length > 0);
});
test("blocked request returns up to 5 free-slot suggestions", () => {
  const r = run({}, [classOccupant]);
  assert.equal(r.ok, false);
  assert.ok(r.suggestions.length > 0 && r.suggestions.length <= 5);
});
test("suggested slots are themselves conflict-free", () => {
  const r = run({}, [classOccupant]);
  for (const s of r.suggestions) {
    const check = checkConflicts({ request: { ...base, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, venueId: s.venueId }, course, existing: [classOccupant], venues, settings, suggest: false });
    assert.equal(check.ok, true, `suggestion ${s.dayOfWeek} ${s.startTime} should be free`);
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
