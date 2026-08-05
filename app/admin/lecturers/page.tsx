import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { EntityManager, type CrudColumn, type CrudField } from "@/components/crud/entity-manager";
import { saveLecturer, deleteLecturer, demoteHod } from "./actions";
import { AssignHodDialog, type AssignDepartment, type AssignStaff } from "./assign-hod-dialog";

export const dynamic = "force-dynamic";

export default async function LecturersPage() {
  await requireRole("admin");
  // Heads of Department are teaching staff too, so both roles are listed here. This is
  // also the only screen where a role can be changed.
  const [staff, departments] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["lecturer", "hod"] } },
      include: { department: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Who currently heads each department, so both the picker and the demote confirmation
  // can name the person involved.
  const headByDepartment = new Map<number, string>();
  for (const s of staff) {
    if (s.role === "hod" && s.departmentId != null) headByDepartment.set(s.departmentId, s.name);
  }

  const rows = staff.map((l) => {
    const isHod = l.role === "hod";
    const departmentName = l.department?.name ?? "Unassigned";

    return {
      id: l.id,
      name: l.name,
      email: l.email,
      staffId: l.staffId ?? "",
      departmentId: l.departmentId ?? "",
      departmentName,
      roleLabel: isHod ? `HOD · ${l.department?.code ?? ""}`.trim() : "Lecturer",
      phone: l.phone ?? "",
      isActive: l.isActive,
      statusLabel: l.isActive ? "Active" : "Inactive",
      // Promotion happens through the Assign HOD dialog, where the department is chosen
      // at the same time. Only stepping down is a single-target action.
      roleActionLabel: isHod ? "Make lecturer" : "",
      roleActionConfirm: isHod
        ? `Step ${l.name} down from Head of ${departmentName} to a normal lecturer?\n\n` +
          `They stay in ${departmentName} and keep any classes they teach.`
        : "",
    };
  });

  const assignDepartments: AssignDepartment[] = departments.map((d) => ({
    id: d.id,
    name: d.name,
    headName: headByDepartment.get(d.id) ?? null,
  }));

  const assignStaff: AssignStaff[] = staff
    .filter((s) => s.isActive)
    .map((s) => ({
      id: s.id,
      name: s.name,
      role: s.role,
      departmentId: s.departmentId,
      departmentName: s.department?.name ?? "Unassigned",
    }));

  const columns: CrudColumn[] = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "staffId", label: "Staff ID" },
    { key: "departmentName", label: "Department" },
    { key: "roleLabel", label: "Role" },
    { key: "statusLabel", label: "Status" },
  ];

  const fields: CrudField[] = [
    { name: "name", label: "Full name", type: "text", required: true, placeholder: "Henrietta Insange" },
    { name: "email", label: "Email", type: "email", required: true, placeholder: "henrietta.insange@yibs.test" },
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
      title="Lecturers & Heads of Department"
      subtitle="Create and manage teaching accounts. Use Assign HOD to pick a department and its Head together, or Make lecturer to step a Head down. Staff with allocations are deactivated instead of deleted."
      resource="Lecturer"
      columns={columns}
      fields={fields}
      rows={rows}
      saveAction={saveLecturer}
      deleteAction={deleteLecturer}
      headerExtra={<AssignHodDialog departments={assignDepartments} staff={assignStaff} />}
      rowAction={{
        action: demoteHod,
        labelKey: "roleActionLabel",
        confirmKey: "roleActionConfirm",
        className: "text-sm font-medium text-amber-600 hover:text-amber-700",
      }}
    />
  );
}
