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

  const nav: NavGroup[] = [
    {
      items: [{ href: "/hod", label: "Dashboard", icon: <IconHome />, exact: true }],
    },
    {
      title: "Department",
      items: [
        { href: "/hod/courses", label: "Courses", icon: <IconBook /> },
        { href: "/hod/lecturers", label: "Lecturers", icon: <IconUsers /> },
        { href: "/hod/allocations", label: "Allocations", icon: <IconClipboard /> },
      ],
    },
    {
      title: "Timetable",
      items: [
        { href: "/hod/timetable", label: "My department", icon: <IconGrid /> },
        { href: "/hod/requests", label: "Requests", icon: <IconCalendar /> },
      ],
    },
    {
      title: "Tools",
      items: [
        { href: "/hod/generate", label: "Generate timetable", icon: <IconSpark /> },
      ],
    },
  ];

  return (
    <DashboardShell roleLabel="HOD" userName={user.name} nav={nav}>
      {children}
    </DashboardShell>
  );
}
