import { requireRole } from "@/lib/auth/current-user";
import { DashboardShell, type NavGroup } from "@/components/dashboard-shell";
import {
  IconHome,
  IconCalendar,
  IconBuilding,
  IconGrid,
  IconBook,
  IconUsers,
  IconClipboard,
  IconSpark,
  IconFile,
  IconSettings,
} from "@/components/icons";

// Admin area layout. requireRole enforces admin access server-side (middleware is the
// first gate). Items marked `soon` are flipped live as Phases 3, 6, 7 and 8 build them.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin");

  const nav: NavGroup[] = [
    {
      items: [{ href: "/admin", label: "Dashboard", icon: <IconHome />, exact: true }],
    },
    {
      title: "Academic setup",
      items: [
        { href: "/admin/sessions", label: "Sessions", icon: <IconCalendar /> },
        { href: "/admin/departments", label: "Departments", icon: <IconBuilding /> },
        { href: "/admin/programmes", label: "Programmes", icon: <IconGrid /> },
        { href: "/admin/courses", label: "Courses", icon: <IconBook /> },
        { href: "/admin/venues", label: "Venues", icon: <IconBuilding /> },
        { href: "/admin/lecturers", label: "Lecturers", icon: <IconUsers /> },
      ],
    },
    {
      title: "Allocation",
      items: [
        { href: "/admin/requests", label: "Requests", icon: <IconClipboard /> },
        { href: "/admin/allocations", label: "Manage classes", icon: <IconCalendar /> },
        { href: "/admin/generate", label: "Generate timetable", icon: <IconSpark /> },
        { href: "/admin/timetable", label: "Master timetable", icon: <IconGrid /> },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/admin/reports", label: "Reports", icon: <IconFile /> },
        { href: "/admin/audit", label: "Audit log", icon: <IconClipboard /> },
        { href: "/admin/settings", label: "Settings", icon: <IconSettings /> },
      ],
    },
  ];

  return (
    <DashboardShell roleLabel="Admin" userName={user.name} nav={nav}>
      {children}
    </DashboardShell>
  );
}
