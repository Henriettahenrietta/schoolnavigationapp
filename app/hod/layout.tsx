import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/current-user";
import { DashboardShell, type NavGroup } from "@/components/dashboard-shell";
import {
  IconHome,
  IconBook,
  IconUsers,
  IconCalendar,
  IconGrid,
  IconClipboard,
  IconSpark,
} from "@/components/icons";

export default async function HodLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("hod");

  // The department name is the Head's primary orientation, so it labels the workspace.
  const department = user.departmentId
    ? await prisma.department.findUnique({ where: { id: user.departmentId } })
    : null;

  const nav: NavGroup[] = [
    {
      items: [{ href: "/hod", label: "Dashboard", icon: <IconHome />, exact: true }],
    },
    {
      title: department ? department.name : "Department",
      items: [
        { href: "/hod/courses", label: "Courses", icon: <IconBook /> },
        { href: "/hod/lecturers", label: "Lecturers", icon: <IconUsers /> },
        { href: "/hod/allocations", label: "Classes", icon: <IconClipboard /> },
      ],
    },
    {
      title: "Timetable",
      items: [
        { href: "/hod/timetable", label: "Department timetable", icon: <IconGrid /> },
        { href: "/hod/requests", label: "Requests", icon: <IconCalendar /> },
        { href: "/hod/generate", label: "Generate timetable", icon: <IconSpark /> },
      ],
    },
  ];

  return (
    <DashboardShell
      roleLabel={department ? `HOD · ${department.code}` : "HOD"}
      userName={user.name}
      nav={nav}
    >
      {children}
    </DashboardShell>
  );
}
