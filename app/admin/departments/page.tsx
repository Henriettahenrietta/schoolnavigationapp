import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import {
  EntityManager,
  type CrudColumn,
  type CrudField,
} from "@/components/crud/entity-manager";
import { saveDepartment, deleteDepartment } from "./actions";

export default async function DepartmentsPage() {
  await requireRole("admin");
  const depts = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { courses: true, users: true, programmes: true } } },
  });

  const rows = depts.map((d) => ({
    id: d.id,
    name: d.name,
    code: d.code,
    courses: d._count.courses,
    lecturers: d._count.users,
  }));

  const columns: CrudColumn[] = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "courses", label: "Courses" },
    { key: "lecturers", label: "Lecturers" },
  ];

  const fields: CrudField[] = [
    { name: "name", label: "Department name", type: "text", required: true, fullWidth: true, placeholder: "Computer Science" },
    { name: "code", label: "Code", type: "text", required: true, placeholder: "CSC", hint: "Short unique code." },
  ];

  return (
    <EntityManager
      title="Departments"
      subtitle="Academic departments that own programmes and courses."
      resource="Department"
      columns={columns}
      fields={fields}
      rows={rows}
      saveAction={saveDepartment}
      deleteAction={deleteDepartment}
    />
  );
}
