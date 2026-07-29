import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { EntityManager, type CrudColumn, type CrudField } from "@/components/crud/entity-manager";
import { saveCourse, deleteCourse } from "./actions";
import { LEVELS } from "@/lib/constants";

export default async function CoursesPage() {
  await requireRole("admin");
  const [courses, departments, sessions] = await Promise.all([
    prisma.course.findMany({
      include: { department: true, session: true },
      orderBy: [{ departmentId: "asc" }, { level: "asc" }, { code: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.session.findMany({ orderBy: [{ isActive: "desc" }, { name: "desc" }] }),
  ]);

  const activeSession = sessions.find((s) => s.isActive) ?? sessions[0];

  const rows = courses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    departmentId: c.departmentId,
    departmentCode: c.department.code,
    level: c.level,
    creditUnits: c.creditUnits,
    expectedStudents: c.expectedStudents,
    semester: c.semester,
    semesterLabel: c.semester === "first" ? "First" : "Second",
    sessionId: c.sessionId,
    sessionName: c.session.name,
  }));

  const columns: CrudColumn[] = [
    { key: "code", label: "Code" },
    { key: "title", label: "Title" },
    { key: "departmentCode", label: "Dept" },
    { key: "level", label: "Level" },
    { key: "creditUnits", label: "Units" },
    { key: "expectedStudents", label: "Students" },
  ];

  const fields: CrudField[] = [
    { name: "code", label: "Course code", type: "text", required: true, placeholder: "CSC201" },
    { name: "title", label: "Title", type: "text", required: true, fullWidth: true, placeholder: "Data Structures" },
    {
      name: "departmentId",
      label: "Department",
      type: "select",
      required: true,
      options: departments.map((d) => ({ value: d.id, label: d.name })),
    },
    { name: "level", label: "Level", type: "select", required: true, options: LEVELS.map((l) => ({ value: l, label: String(l) })) },
    { name: "creditUnits", label: "Credit units", type: "number", required: true, placeholder: "2" },
    { name: "expectedStudents", label: "Expected students", type: "number", required: true, placeholder: "120" },
    {
      name: "semester",
      label: "Semester",
      type: "select",
      required: true,
      options: [
        { value: "first", label: "First" },
        { value: "second", label: "Second" },
      ],
    },
    {
      name: "sessionId",
      label: "Session",
      type: "select",
      required: true,
      options: sessions.map((s) => ({ value: s.id, label: `${s.name} (${s.semester})` })),
    },
  ];

  return (
    <EntityManager
      title="Courses"
      subtitle={
        activeSession
          ? `Courses offered. Active session: ${activeSession.name} (${activeSession.semester}).`
          : "Create a session first, then add courses."
      }
      resource="Course"
      columns={columns}
      fields={fields}
      rows={rows}
      saveAction={saveCourse}
      deleteAction={deleteCourse}
    />
  );
}
