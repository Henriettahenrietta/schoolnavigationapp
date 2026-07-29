import Link from "next/link";
import { NavLink, type NavItem } from "./nav-link";
import { IconLogout } from "./icons";
import { SCHOOL_SHORT } from "@/lib/branding";

export type { NavItem };
export type NavGroup = { title?: string; items: NavItem[] };

// The authenticated app frame: fixed sidebar + top bar + scrollable content. Shared by the
// admin and lecturer areas; each passes its own grouped nav and role label.
export function DashboardShell({
  roleLabel,
  userName,
  nav,
  children,
}: {
  roleLabel: string;
  userName: string;
  nav: NavGroup[];
  children: React.ReactNode;
}) {
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const groups = (
    <>
      {nav.map((group, gi) => (
        <div key={gi} className="mb-4">
          {group.title && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>
      ))}
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
            {SCHOOL_SHORT}
          </span>
          <span className="font-semibold text-slate-800">{SCHOOL_SHORT} Timetable</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">{groups}</nav>
        <div className="border-t border-slate-100 p-3">
          <p className="mb-2 flex items-center gap-2 px-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-800">{userName}</span>
              <span className="block text-xs text-slate-500">{roleLabel}</span>
            </span>
          </p>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <IconLogout className="text-slate-400" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-xs font-bold text-white">
              {SCHOOL_SHORT}
            </span>
            <span className="font-semibold text-slate-800">{SCHOOL_SHORT}</span>
          </div>
          <div className="hidden text-sm text-slate-500 md:block">{roleLabel} workspace</div>
          <div className="flex items-center gap-3">
            <Link href="/timetable" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Public timetable
            </Link>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 md:hidden">
              {initials}
            </span>
          </div>
        </header>

        {/* Mobile nav (horizontal, no groups) */}
        <nav className="no-print flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {nav.flatMap((g) => g.items).map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          <form action="/logout" method="post" className="ml-auto">
            <button type="submit" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-red-600">
              Sign out
            </button>
          </form>
        </nav>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
