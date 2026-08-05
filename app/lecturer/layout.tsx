import { requireRole } from "@/lib/auth/current-user";
import { DashboardShell, type NavGroup } from "@/components/dashboard-shell";
import {
  IconHome,
  IconClipboard,
  IconGrid,
  IconCalendar,
  IconBell,
  IconSpark,
  IconBuilding,
} from "@/components/icons";

// Lecturer area layout. The request/timetable/notifications pages are flipped live in
// Phases 5, 6 and 8.
export default async function LecturerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("lecturer");

  const nav: NavGroup[] = [
    {
      items: [
        { href: "/lecturer", label: "Dashboard", icon: <IconHome />, exact: true },
        // A lecturer may teach across departments, so this lists all of them at once.
        { href: "/lecturer/departments", label: "My departments", icon: <IconBuilding /> },
      ],
    },
    {
      title: "Allocations",
      items: [
        { href: "/lecturer/allocate", label: "Allocate my course", icon: <IconSpark /> },
        { href: "/lecturer/request", label: "Request allocation", icon: <IconClipboard /> },
        { href: "/lecturer/requests", label: "My requests", icon: <IconClipboard /> },
        { href: "/lecturer/timetable", label: "My timetable", icon: <IconGrid /> },
      ],
    },
    {
      title: "Profile",
      items: [
        { href: "/lecturer/availability", label: "Availability", icon: <IconCalendar /> },
        { href: "/lecturer/notifications", label: "Notifications", icon: <IconBell /> },
      ],
    },
  ];

  return (
    <DashboardShell roleLabel="Lecturer" userName={user.name} nav={nav}>
      {children}
    </DashboardShell>
  );
}
