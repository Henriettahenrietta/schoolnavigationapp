/**
 * Seed script — Yaounde International Business School (YIBS).
 * Creates the full set of business-school departments, each with programmes, courses and
 * lecturers, plus venues, an admin, availability, and a batch of conflict-free approved
 * allocations — leaving the rest for a live "Generate Timetable" demo.
 * Run with: npm run db:seed  (or npm run db:reset to rebuild from scratch).
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { overlaps } from "../lib/time";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        (process.env.DATABASE_URL || process.env.DIRECT_URL || "") +
        ((process.env.DATABASE_URL || "").includes("?") ? "&" : "?") +
        "connection_limit=5&connect_timeout=60&pool_timeout=60",
    },
  },
});

const PASSWORD = "password";
const DAYS = ["mon", "tue", "wed", "thu", "fri"] as const;
const BLOCKS: Array<[string, string]> = [
  ["08:00", "10:00"],
  ["10:00", "12:00"],
  ["12:00", "14:00"],
  ["14:00", "16:00"],
  ["16:00", "18:00"],
];

// The YIBS departments. Each has four courses (one per level 100–400) and two lecturers.
type DeptConfig = {
  code: string;
  name: string;
  titles: [string, string, string, string];
  lecturers: [string, string];
};

const DEPARTMENTS: DeptConfig[] = [
  {
    code: "ACC",
    name: "Accounting",
    titles: ["Financial Accounting", "Cost Accounting", "Management Accounting", "Auditing & Assurance"],
    lecturers: ["Dr. Emmanuel Nkeng", "Dr. Estelle Fotso"],
  },
  {
    code: "BFN",
    name: "Banking and Finance",
    titles: ["Principles of Banking", "Corporate Finance", "Investment Analysis", "International Finance"],
    lecturers: ["Dr. Achille Mbarga", "Dr. Nadège Ngassa"],
  },
  {
    code: "MKT",
    name: "Marketing",
    titles: ["Principles of Marketing", "Consumer Behaviour", "Digital Marketing", "Marketing Research"],
    lecturers: ["Dr. Brice Tchoua", "Dr. Christelle Etonde"],
  },
  {
    code: "MGT",
    name: "Management",
    titles: ["Principles of Management", "Organisational Behaviour", "Operations Management", "Strategic Management"],
    lecturers: ["Prof. Rodrigue Njoya", "Dr. Sandrine Atangana"],
  },
  {
    code: "HRM",
    name: "Human Resource Management",
    titles: ["Introduction to HRM", "Recruitment & Selection", "Performance Management", "Labour Relations"],
    lecturers: ["Dr. Serge Mballa", "Dr. Mireille Mengue"],
  },
  {
    code: "BUS",
    name: "Business Administration",
    titles: ["Business Communication", "Business Ethics", "Entrepreneurship", "Business Policy"],
    lecturers: ["Dr. Yannick Fombad", "Dr. Carine Ekwalla"],
  },
  {
    code: "ECO",
    name: "Economics",
    titles: ["Microeconomics", "Macroeconomics", "Development Economics", "Econometrics"],
    lecturers: ["Prof. Arnaud Nana", "Dr. Diane Kamdem"],
  },
  {
    code: "CSC",
    name: "Computer Science",
    titles: ["Introduction to Computing", "Database Systems", "Web Development", "Management Information Systems"],
    lecturers: ["Dr. Landry Sona", "Dr. Gaelle Tabi"],
  },
  {
    code: "LTM",
    name: "Logistics and Transport Management",
    titles: ["Introduction to Logistics", "Supply Chain Management", "Transport Economics", "Warehouse Management"],
    lecturers: ["Dr. Ulrich Ngu", "Dr. Sylvie Awa"],
  },
  {
    code: "PMG",
    name: "Project Management",
    titles: ["Project Planning", "Risk Management", "Project Financing", "Agile Project Management"],
    lecturers: ["Dr. Franck Fon", "Dr. Aurélie Tayong"],
  },
  {
    code: "INS",
    name: "Insurance",
    titles: ["Principles of Insurance", "Risk & Insurance", "Life Assurance", "Reinsurance"],
    lecturers: ["Dr. Boris Ndi", "Dr. Blaise Achu"],
  },
  {
    code: "LAW",
    name: "Business Law",
    titles: ["Introduction to Law", "Commercial Law", "Company Law", "Labour Law"],
    lecturers: ["Prof. Hervé Biya", "Dr. Cédric Fombad"],
  },
];

const LEVELS = [100, 200, 300, 400] as const;

function emailFor(name: string): string {
  return (
    name
      .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s+/i, "")
      .toLowerCase()
      .replace(/[^a-z]+/g, ".")
      .replace(/^\.|\.$/g, "") + "@yibs.test"
  );
}

async function main() {
  console.log("Clearing existing data…");
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

  await prisma.setting.create({
    data: {
      dayStartTime: "08:00", dayEndTime: "18:00", slotDurationMinutes: 60,
      workingDays: JSON.stringify(["mon", "tue", "wed", "thu", "fri"]),
      maxWeeklyHoursPerLecturer: 18, allowOverrides: true,
      lunchStart: "13:00", lunchEnd: "14:00", maxConsecutiveHours: 4,
    },
  });

  const session = await prisma.session.create({
    data: { name: "2025/2026", semester: "first", isActive: true, isPublished: false, startDate: new Date("2025-09-15"), endDate: new Date("2026-01-30") },
  });

  // Venues (8).
  const venuesData = [
    { name: "LT1", building: "Main Block", capacity: 300, type: "lecture_hall" },
    { name: "LT2", building: "Main Block", capacity: 250, type: "lecture_hall" },
    { name: "Hall A", building: "Business Complex", capacity: 200, type: "lecture_hall" },
    { name: "Hall B", building: "Business Complex", capacity: 150, type: "lecture_hall" },
    { name: "Room 101", building: "Annex", capacity: 90, type: "lecture_hall" },
    { name: "Room 102", building: "Annex", capacity: 90, type: "lecture_hall" },
    { name: "Computer Lab", building: "IT Building", capacity: 60, type: "lab" },
    { name: "Seminar Room", building: "Annex", capacity: 50, type: "studio" },
  ];
  const venues = [];
  for (const v of venuesData) venues.push(await prisma.venue.create({ data: v }));

  // Admin.
  await prisma.user.create({
    data: { name: "System Administrator", email: "admin@cas.test", passwordHash: await bcrypt.hash(PASSWORD, 10), role: "admin", isActive: true },
  });

  // Departments, lecturers, availability, courses.
  type SeedCourse = { id: number; departmentId: number; level: number; expectedStudents: number };
  const courses: SeedCourse[] = [];
  const lecturersByDept = new Map<number, number[]>();
  const availabilityRows: any[] = [];
  const hash = await bcrypt.hash(PASSWORD, 10);

  for (const dept of DEPARTMENTS) {
    const d = await prisma.department.create({ data: { name: dept.name, code: dept.code } });

    for (const level of LEVELS) {
      await prisma.programme.create({ data: { departmentId: d.id, name: `${dept.name} ${level} Level`, level } });
    }

    // Two lecturers per department.
    const lecIds: number[] = [];
    for (let i = 0; i < dept.lecturers.length; i++) {
      const name = dept.lecturers[i];
      const u = await prisma.user.create({
        data: {
          name, email: emailFor(name), passwordHash: hash, role: "lecturer",
          staffId: `${dept.code}/00${i + 1}`, departmentId: d.id, isActive: true,
        },
      });
      lecIds.push(u.id);
      for (const day of DAYS) {
        availabilityRows.push({ lecturerId: u.id, dayOfWeek: day, startTime: "08:00", endTime: "18:00", preference: "preferred" });
      }
    }
    lecturersByDept.set(d.id, lecIds);

    // Four courses (one per level).
    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      const expectedStudents = level === 100 ? 180 : level === 200 ? 130 : level === 300 ? 80 : 45;
      const c = await prisma.course.create({
        data: {
          code: `${dept.code}${level + 1}`, title: dept.titles[i], creditUnits: 2,
          departmentId: d.id, level, expectedStudents, semester: "first", sessionId: session.id,
        },
      });
      courses.push({ id: c.id, departmentId: d.id, level, expectedStudents });
    }
  }
  await prisma.lecturerAvailability.createMany({ data: availabilityRows });

  // ~24 conflict-free approved allocations (2 per department), spread round-robin so every
  // department appears in the initial timetable; the rest stay unallocated for the demo.
  type Placed = { departmentId: number; level: number; lecturerId: number; venueId: number; day: string; start: string; end: string };
  const placed: Placed[] = [];
  const clashes = (cand: Placed) =>
    placed.some(
      (p) =>
        p.day === cand.day &&
        overlaps(p.start, p.end, cand.start, cand.end) &&
        ((p.departmentId === cand.departmentId && p.level === cand.level) || p.lecturerId === cand.lecturerId || p.venueId === cand.venueId),
    );

  // Round-robin ordering: level 100 of every dept first, then 200, etc.
  const ordered = [...courses].sort((a, b) => a.level - b.level || a.departmentId - b.departmentId);
  const target = 24;
  const allocationRows: any[] = [];
  let allocated = 0;
  for (const course of ordered) {
    if (allocated >= target) break;
    const suitable = venues.filter((v) => v.capacity >= course.expectedStudents).sort((a, b) => a.capacity - b.capacity);
    const lecId = (lecturersByDept.get(course.departmentId) ?? [])[0];
    if (!lecId) continue;
    let done = false;
    for (const day of DAYS) {
      for (const [start, end] of BLOCKS) {
        for (const v of suitable) {
          const cand: Placed = { departmentId: course.departmentId, level: course.level, lecturerId: lecId, venueId: v.id, day, start, end };
          if (!clashes(cand)) {
            placed.push(cand);
            allocationRows.push({ sessionId: session.id, courseId: course.id, lecturerId: lecId, venueId: v.id, dayOfWeek: day, startTime: start, endTime: end, status: "approved", source: "manual", approvedAt: new Date() });
            allocated++;
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

  console.log("Seed complete (Yaounde International Business School):");
  console.log(`  departments: ${DEPARTMENTS.length}`);
  console.log(`  venues:      ${venues.length}`);
  console.log(`  courses:     ${courses.length}`);
  console.log(`  lecturers:   ${DEPARTMENTS.length * 2} (+ 1 admin)`);
  console.log(`  allocations: ${allocated} approved (conflict-free)`);
  console.log(`  unallocated: ${courses.length - allocated} courses for the generator demo`);
  console.log("");
  console.log("Login: admin@cas.test / password   |   e.g. emmanuel.nkeng@yibs.test / password");
}

async function run() {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      await main();
      return;
    } catch (e: any) {
      const transient = e?.message?.includes("Can't reach database server") || e?.code === "P2024" || e?.code === "P1001";
      if (transient && attempt < 4) {
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
