import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { EntityManager, type CrudColumn, type CrudField } from "@/components/crud/entity-manager";
import { saveProgramme, deleteProgramme } from "./actions";
import { LEVELS } from "@/lib/constants";

export default async function ProgrammesPage() {
  await requireRole("admin");
  const [programmes, departments] = await Promise.all([
    prisma.programme.findMany({ include: { department: true }, orderBy: [{ departmentId: "asc" }, { level: "asc" }] }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = programmes.map((p) => ({
    id: p.id,
    name: p.name,
    departmentId: p.departmentId,
    departmentName: p.department.name,
    level: p.level,
  }));

  const columns: CrudColumn[] = [
    { key: "name", label: "Programme" },
    { key: "departmentName", label: "Department" },
    { key: "level", label: "Level" },
  ];

  const fields: CrudField[] = [
    { name: "name", label: "Programme name", type: "text", required: true, fullWidth: true, placeholder: "Computer Science 100 Level" },
    {
      name: "departmentId",
      label: "Department",
      type: "select",
      required: true,
      options: departments.map((d) => ({ value: d.id, label: d.name })),
    },
    {
      name: "level",
      label: "Level",
      type: "select",
      required: true,
      options: LEVELS.map((l) => ({ value: l, label: String(l) })),
    },
  ];

  return (
    <EntityManager
      title="Programmes"
      subtitle="Degree programmes per department and level."
      resource="Programme"
      columns={columns}
      fields={fields}
      rows={rows}
      saveAction={saveProgramme}
      deleteAction={deleteProgramme}
    />
  );
}
