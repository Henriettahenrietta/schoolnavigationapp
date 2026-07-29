/**
 * Seed script (Section 7).
 * Creates: 1 active session, 3 departments, 8 venues, 40 courses, 1 admin
 * (admin@cas.test / password), 6 lecturers with availability, and ~20 conflict-free
 * approved allocations — leaving ~20 courses unallocated for a live "Generate Timetable"
 * demo. Run with: npm run db:seed  (or npm run db:reset to rebuild from scratch).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { overlaps } from "../lib/time";

// Seed over the pooled connection (kept warm by Neon) with generous timeouts for slow
// networks. Inserts are batched (createMany) so the small pool is never exhausted.
const baseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL || "";
const seedUrl =
  baseUrl + (baseUrl.includes("?") ? "&" : "?") + "connection_limit=5&connect_timeout=60&pool_timeout=60";

const prisma = new PrismaClient({ datasources: { db: { url: seedUrl } } });

const PASSWORD = "password";
const DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;
// 2-hour candidate blocks within an 08:00–18:00 day.
const BLOCKS: Array<[string, string]> = [
  ["08:00", "10:00"],
  ["10:00", "12:00"],
  ["12:00", "14:00"],
  ["14:00", "16:00"],
  ["16:00", "18:00"],
];

async function main() {
  console.log("Clearing existing data…");
  // Order matters because of foreign keys.
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.generationRun.deleteMany();
  await prisma.lecturerAvailability.deleteMany();
  await prisma.course.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.session.deleteMany();
  await prisma.setting.deleteMany();

  // ---- Settings -----------------------------------------------------------
  await prisma.setting.create({
    data: {
      dayStartTime: "08:00",
      dayEndTime: "18:00",
      slotDurationMinutes: 60,
      workingDays: JSON.stringify(["mon", "tue", "wed", "thu", "fri"]),
      maxWeeklyHoursPerLecturer: 18,
      allowOverrides: true,
      lunchStart: "13:00",
      lunchEnd: "14:00",
      maxConsecutiveHours: 4,
    },
  });

  // ---- Session ------------------------------------------------------------
  const session = await prisma.session.create({
    data: {
      name: "2025/2026",
      semester: "first",
      isActive: true,
      startDate: new Date("2025-09-15"),
      endDate: new Date("2026-01-30"),
    },
  });

  // ---- Departments --------------------------------------------------------
  const csc = await prisma.department.create({
    data: { name: "Computer Science", code: "CSC" },
  });
  const mth = await prisma.department.create({
    data: { name: "Mathematics", code: "MTH" },
  });
  const phy = await prisma.department.create({
    data: { name: "Physics", code: "PHY" },
  });
  const departments = [csc, mth, phy];

  // ---- Programmes ---------------------------------------------------------
  for (const d of departments) {
    for (const level of [100, 200, 300, 400]) {
      await prisma.programme.create({
        data: { departmentId: d.id, name: `${d.name} ${level} Level`, level },
      });
    }
  }

  // ---- Venues (8) ---------------------------------------------------------
  const venuesData = [
    { name: "LT1", building: "Main Block", capacity: 300, type: "lecture_hall" },
    { name: "LT2", building: "Main Block", capacity: 250, type: "lecture_hall" },
    { name: "Hall A", building: "Science Complex", capacity: 200, type: "lecture_hall" },
    { name: "Hall B", building: "Science Complex", capacity: 150, type: "lecture_hall" },
    { name: "Lab 1", building: "CS Building", capacity: 60, type: "lab" },
    { name: "Lab 2", building: "CS Building", capacity: 60, type: "lab" },
    { name: "Lab 3", building: "Physics Building", capacity: 40, type: "lab" },
    { name: "Studio 1", building: "Arts Block", capacity: 80, type: "studio" },
  ];
  const venues = [];
  for (const v of venuesData) venues.push(await prisma.venue.create({ data: v }));

  // ---- Admin --------------------------------------------------------------
  const adminHash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.create({
    data: {
      name: "System Administrator",
      email: "admin@cas.test",
      passwordHash: adminHash,
      role: "admin",
      isActive: true,
    },
  });

  // ---- Lecturers (6) ------------------------------------------------------
  const lecturerSpecs = [
    { name: "Dr. Ada Obi", email: "ada.obi@cas.test", staffId: "CSC/001", dept: csc },
    { name: "Dr. Ngozi Eze", email: "ngozi.eze@cas.test", staffId: "CSC/002", dept: csc },
    { name: "Dr. Bola Ade", email: "bola.ade@cas.test", staffId: "MTH/001", dept: mth },
    { name: "Dr. Chidi Okafor", email: "chidi.okafor@cas.test", staffId: "MTH/002", dept: mth },
    { name: "Prof. Musa Bello", email: "musa.bello@cas.test", staffId: "PHY/001", dept: phy },
    { name: "Dr. Fatima Sani", email: "fatima.sani@cas.test", staffId: "PHY/002", dept: phy },
  ];
  const lecturers = [];
  const availabilityRows: Array<{
    lecturerId: number;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    preference: string;
  }> = [];
  for (const spec of lecturerSpecs) {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const u = await prisma.user.create({
      data: {
        name: spec.name,
        email: spec.email,
        passwordHash: hash,
        role: "lecturer",
        staffId: spec.staffId,
        departmentId: spec.dept.id,
        isActive: true,
      },
    });
    lecturers.push({ user: u, dept: spec.dept });

    // Availability: available Mon–Fri 08:00–18:00, one 'unavailable' block to make the
    // generator's availability handling visible in the demo.
    for (const day of DAYS) {
      availabilityRows.push({
        lecturerId: u.id,
        dayOfWeek: day,
        startTime: "08:00",
        endTime: "18:00",
        preference: "preferred",
      });
    }
    // Prof. Musa is unavailable Friday afternoons.
    if (spec.staffId === "PHY/001") {
      availabilityRows.push({
        lecturerId: u.id,
        dayOfWeek: "fri",
        startTime: "14:00",
        endTime: "18:00",
        preference: "unavailable",
      });
    }
  }
  await prisma.lecturerAvailability.createMany({ data: availabilityRows });

  // ---- Courses (40) -------------------------------------------------------
  // Titles pool per department; codes are DEPT + level-based number.
  const titlePool: Record<string, string[]> = {
    CSC: [
      "Introduction to Computing",
      "Data Structures",
      "Operating Systems",
      "Database Systems",
      "Computer Networks",
      "Software Engineering",
      "Artificial Intelligence",
      "Web Development",
      "Algorithms",
      "Computer Architecture",
      "Compiler Construction",
      "Machine Learning",
      "Cyber Security",
      "Distributed Systems",
    ],
    MTH: [
      "Calculus I",
      "Linear Algebra",
      "Real Analysis",
      "Abstract Algebra",
      "Differential Equations",
      "Numerical Methods",
      "Probability Theory",
      "Statistics",
      "Complex Analysis",
      "Topology",
      "Discrete Mathematics",
      "Mathematical Modelling",
      "Operations Research",
    ],
    PHY: [
      "Mechanics",
      "Electromagnetism",
      "Thermodynamics",
      "Quantum Physics",
      "Optics",
      "Nuclear Physics",
      "Solid State Physics",
      "Electronics",
      "Statistical Physics",
      "Astrophysics",
      "Classical Mechanics",
      "Modern Physics",
      "Electrodynamics",
    ],
  };

  type SeedCourse = {
    id: number;
    departmentId: number;
    level: number;
    expectedStudents: number;
    lecturerId: number;
  };
  const courses: SeedCourse[] = [];
  let created = 0;
  const levels = [100, 200, 300, 400];

  // Round-robin lecturers within each department.
  const lecturersByDept = new Map<number, typeof lecturers>();
  for (const l of lecturers) {
    const arr = lecturersByDept.get(l.dept.id) ?? [];
    arr.push(l);
    lecturersByDept.set(l.dept.id, arr);
  }

  outer: for (const d of departments) {
    const titles = titlePool[d.code];
    const deptLecturers = lecturersByDept.get(d.id)!;
    let idx = 0;
    for (const level of levels) {
      // 4 courses at 100/200 level, 3 at 300/400 → 14 per dept; capped at 40 total.
      const perLevel = level <= 200 ? 4 : 3;
      for (let n = 1; n <= perLevel; n++) {
        if (created >= 40) break outer;
        const title = titles[(idx) % titles.length];
        const code = `${d.code}${level + n}`; // e.g. CSC101, CSC102 …
        const expectedStudents =
          level === 100 ? 220 : level === 200 ? 160 : level === 300 ? 90 : 55;
        const lecturer = deptLecturers[idx % deptLecturers.length];
        const c = await prisma.course.create({
          data: {
            code,
            title,
            creditUnits: 2,
            departmentId: d.id,
            level,
            expectedStudents,
            semester: "first",
            sessionId: session.id,
          },
        });
        courses.push({
          id: c.id,
          departmentId: d.id,
          level,
          expectedStudents,
          lecturerId: lecturer.user.id,
        });
        idx++;
        created++;
      }
    }
  }

  // ---- ~20 conflict-free approved allocations ----------------------------
  // A tiny greedy assigner that guarantees no class/lecturer/venue overlap, so the
  // seeded timetable is valid. The remaining ~20 courses stay unallocated for the
  // live generator demo.
  type Placed = {
    departmentId: number;
    level: number;
    lecturerId: number;
    venueId: number;
    day: string;
    start: string;
    end: string;
  };
  const placed: Placed[] = [];

  function clashes(cand: Placed): boolean {
    for (const p of placed) {
      if (p.day !== cand.day) continue;
      if (!overlaps(p.start, p.end, cand.start, cand.end)) continue;
      // class conflict (same dept + level), lecturer conflict, or venue conflict
      if (p.departmentId === cand.departmentId && p.level === cand.level) return true;
      if (p.lecturerId === cand.lecturerId) return true;
      if (p.venueId === cand.venueId) return true;
    }
    return false;
  }

  const target = 20;
  let allocatedCount = 0;
  const allocationRows = [];
  for (const course of courses) {
    if (allocatedCount >= target) break;
    // Suitable venues: capacity >= expectedStudents, largest first for big classes.
    const suitable = venues
      .filter((v) => v.capacity >= course.expectedStudents)
      .sort((a, b) => a.capacity - b.capacity);
    let done = false;
    for (const day of DAYS) {
      for (const [start, end] of BLOCKS) {
        for (const v of suitable) {
          const cand: Placed = {
            departmentId: course.departmentId,
            level: course.level,
            lecturerId: course.lecturerId,
            venueId: v.id,
            day,
            start,
            end,
          };
          if (!clashes(cand)) {
            placed.push(cand);
            allocationRows.push({
              sessionId: session.id,
              courseId: course.id,
              lecturerId: course.lecturerId,
              venueId: v.id,
              dayOfWeek: day,
              startTime: start,
              endTime: end,
              status: "approved",
              source: "manual",
              approvedAt: new Date(),
            });
            allocatedCount++;
            done = true;
            break;
          }
        }
        if (done) break;
      }
      if (done) break;
    }
  }
  await prisma.allocation.createMany({ data: allocationRows });

  console.log("Seed complete:");
  console.log(`  session:      ${session.name} (${session.semester}) [active]`);
  console.log(`  departments:  ${departments.length}`);
  console.log(`  venues:       ${venues.length}`);
  console.log(`  courses:      ${courses.length}`);
  console.log(`  lecturers:    ${lecturers.length} (+ 1 admin)`);
  console.log(`  allocations:  ${allocatedCount} approved (conflict-free)`);
  console.log(`  unallocated:  ${courses.length - allocatedCount} courses for the generator demo`);
  console.log("");
  console.log("Login: admin@cas.test / password   |   ada.obi@cas.test / password");
}

// Retry the whole seed a few times to ride out transient network drops to the cloud DB.
async function run() {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await main();
      return;
    } catch (e: any) {
      const transient =
        e?.message?.includes("Can't reach database server") ||
        e?.code === "P2024" ||
        e?.code === "P1001";
      if (transient && attempt < maxAttempts) {
        console.warn(`Attempt ${attempt} failed (${e.code ?? "network"}). Retrying…`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      throw e;
    }
  }
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
