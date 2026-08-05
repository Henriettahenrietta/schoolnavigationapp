import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { EntityManager, type CrudColumn, type CrudField } from "@/components/crud/entity-manager";
import { saveLecturer, deleteLecturer, toggleHodRole } from "./actions";

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

  // Who currently heads each department, so the promote confirmation can name the person
  // being replaced instead of silently swapping them out.
  const headByDepartment = new Map<number, string>();
  for (const s of staff) {
    if (s.role === "hod" && s.departmentId != null) headByDepartment.set(s.departmentId, s.name);
  }

  const allocationCounts = await prisma.allocation.groupBy({
    by: ["lecturerId"],
    _count: true,
  });
  const classesBy = new Map(allocationCounts.map((a) => [a.lecturerId, a._count]));

  const rows = staff.map((l) => {
    const isHod = l.role === "hod";
    const departmentName = l.department?.name ?? "Unassigned";
    const incumbent = l.departmentId != null ? headByDepartment.get(l.departmentId) : undefined;
    const classes = classesBy.get(l.id) ?? 0;

    let roleActionLabel = "";
    let roleActionConfirm = "";
    if (isHod) {
      roleActionLabel = "Make lecturer";
      roleActionConfirm =
        `Demote ${l.name} from Head of ${departmentName} back to a normal lecturer?\n\n` +
        `They will lose the HOD workspace and keep any classes they teach.`;
    } else if (l.departmentId == null) {
      // Cannot head a department they do not belong to; Edit first to assign one.
      roleActionLabel = "";
    } else {
      roleActionLabel = "Make HOD";
      roleActionConfirm =
        `Make ${l.name} Head of ${departmentName}?` +
        (incumbent ? `\n\nThis will demote ${incumbent}, the current Head, back to lecturer.` : "") +
        (classes > 0
          ? `\n\nThey currently teach ${classes} class${classes === 1 ? "" : "es"}, which stay assigned to them.`
          : "");
    }

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
      roleActionLabel,
      roleActionConfirm,
    };
  });

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
      subtitle="Create and manage teaching accounts. Use Make HOD to promote a lecturer, or Make lecturer to step a Head down. Staff with allocations are deactivated instead of deleted."
      resource="Lecturer"
      columns={columns}
      fields={fields}
      rows={rows}
      saveAction={saveLecturer}
      deleteAction={deleteLecturer}
      rowAction={{
        action: toggleHodRole,
        labelKey: "roleActionLabel",
        confirmKey: "roleActionConfirm",
        className: "text-sm font-medium text-amber-600 hover:text-amber-700",
      }}
    />
  );
}
