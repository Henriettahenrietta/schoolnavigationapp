"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  exact?: boolean;
  /** Not built yet — rendered disabled with a "Soon" badge (flipped live as phases land). */
  soon?: boolean;
};

// A sidebar entry. Active routes highlight; `soon` items render disabled so there are no
// dead links while the app is still being built out phase by phase.
export function NavLink({ href, label, icon, exact = false, soon = false }: NavItem) {
  const pathname = usePathname();
  const active =
    !soon && (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  if (soon) {
    return (
      <span
        className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300"
        title="Coming in a later phase"
      >
        {icon && <span className="text-slate-300">{icon}</span>}
        <span className="flex-1">{label}</span>
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Soon
        </span>
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
        active
          ? "bg-brand-50 text-brand-700"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
      )}
    >
      {icon && <span className={cn(active ? "text-brand-600" : "text-slate-400")}>{icon}</span>}
      {label}
    </Link>
  );
}
