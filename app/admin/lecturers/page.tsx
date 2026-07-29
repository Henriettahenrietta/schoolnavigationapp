import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { EntityManager, type CrudColumn, type CrudField } from "@/components/crud/entity-manager";
import { saveLecturer, deleteLecturer } from "./actions";

export default async function LecturersPage() {
  await requireRole("admin");
  const [lecturers, departments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "lecturer" },
      include: { department: true },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const rows = lecturers.map((l) => ({
    id: l.id,
    name: l.name,
    email: l.email,
    staffId: l.staffId ?? "",
    departmentId: l.departmentId ?? "",
    departmentName: l.department?.name ?? "—",
    phone: l.phone ?? "",
    isActive: l.isActive,
    statusLabel: l.isActive ? "Active" : "Inactive",
  }));

  const columns: CrudColumn[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "staffId", label: "Staff ID" },
    { key: "departmentName", label: "Department" },
    { key: "statusLabel", label: "Status" },
  ];

  const fields: CrudField[] = [
    { name: "name", label: "Full name", type: "text", required: true, placeholder: "Dr. Jane Doe" },
    { name: "email", label: "Email", type: "email", required: true, placeholder: "jane.doe@cas.test" },
    { name: "staffId", label: "Staff ID", type: "text", required: true, placeholder: "CSC/003" },
    {
      name: "departmentId",
      label: "Department",
      type: "select",
      required: true,
      options: departments.map((d) => ({ value: d.id, label: d.name })),
    },
    { name: "phone", label: "Phone", type: "text", placeholder: "080..." },
    { name: "password", label: "Password", type: "password", hint: "Required for new lecturers. Leave blank to keep unchanged." },
    { name: "isActive", label: "Active", type: "checkbox", placeholder: "Account is active", fullWidth: true, defaultValue: true },
  ];

  return (
    <EntityManager
      title="Lecturers"
      subtitle="Create and manage lecturer accounts. Lecturers with allocations are deactivated instead of deleted."
      resource="Lecturer"
      columns={columns}
      fields={fields}
      rows={rows}
      saveAction={saveLecturer}
      deleteAction={deleteLecturer}
    />
  );
}
