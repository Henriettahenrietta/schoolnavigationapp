import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SCHOOL_NAME, SCHOOL_SHORT, APP_NAME } from "@/lib/branding";
import {
  IconSpark,
  IconClipboard,
  IconUsers,
  IconGrid,
  IconBell,
  IconFile,
  IconBuilding,
  IconBook,
  IconCalendar,
} from "@/components/icons";

// Public landing page for the YIBS Course Allocation System.
export default async function Home() {
  // Live stats — fall back to sensible numbers if the DB link is briefly unreachable.
  let stats = { departments: 12, courses: 48, lecturers: 24, venues: 8 };
  try {
    const [departments, courses, lecturers, venues] = await Promise.all([
      prisma.department.count(),
      prisma.course.count(),
      prisma.user.count({ where: { role: "lecturer" } }),
      prisma.venue.count(),
    ]);
    stats = { departments, courses, lecturers, venues };
  } catch {
    /* keep fallback */
  }

  const features = [
    { icon: <IconClipboard />, title: "Real-time clash detection", body: "As lecturers pick a slot, the system checks class, lecturer, venue and policy conflicts instantly — and suggests free alternatives." },
    { icon: <IconSpark />, title: "One-click generation", body: "Automatically place every course into a conflict-free day, time and venue, then review the draft before publishing." },
    { icon: <IconUsers />, title: "Role-based access", body: "Separate, secure workspaces for administrators, lecturers and the public — no one sees more than they should." },
    { icon: <IconGrid />, title: "Live timetable grids", body: "Colour-coded class, lecturer and venue views with filters — printable to PDF and exportable to Excel." },
    { icon: <IconBell />, title: "Approvals & notifications", body: "Admins approve, reject or override requests; lecturers are notified the moment their allocation changes." },
    { icon: <IconFile />, title: "Reports & audit trail", body: "Venue utilisation, lecturer workload and department reports, with every action recorded in an audit log." },
  ];

  const steps = [
    { n: "1", title: "Lecturers request", body: "Submit a course, day, time and venue — with instant availability feedback." },
    { n: "2", title: "The system checks", body: "Every request runs through one shared conflict engine, so clashes are impossible." },
    { n: "3", title: "Admin generates & publishes", body: "Generate the full timetable, review it, publish, and students view it online." },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-xs font-bold text-white">{SCHOOL_SHORT}</span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">{SCHOOL_SHORT}</p>
              <p className="text-[11px] text-slate-500">{APP_NAME}</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/timetable" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
              Public timetable
            </Link>
            <Link href="/login" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-white to-white" />
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> {SCHOOL_NAME}
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
              Conflict-free timetabling,{" "}
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">on autopilot</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-slate-600">
              {SCHOOL_SHORT}'s course-allocation system rejects clashes in real time and builds an
              entire conflict-free timetable with one click — then publishes it for students.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="rounded-xl bg-brand-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-brand-700">
                Get started
              </Link>
              <Link href="/timetable" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50">
                View published timetable
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              Demo — Admin: <span className="font-medium text-slate-700">admin@cas.test</span> ·
              Lecturer: <span className="font-medium text-slate-700">emmanuel.nkeng@yibs.test</span>{" "}
              <span className="text-slate-400">(password)</span>
            </p>
          </div>

          {/* Decorative timetable preview */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">2025/2026 · First semester</p>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">● Published</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                {["Mon", "Tue", "Wed", "Thu"].map((d) => (
                  <div key={d} className="rounded bg-slate-50 py-1 text-center font-semibold text-slate-400">{d}</div>
                ))}
                {[
                  "bg-blue-50 border-blue-300 text-blue-900",
                  "bg-emerald-50 border-emerald-300 text-emerald-900",
                  "bg-transparent",
                  "bg-violet-50 border-violet-300 text-violet-900",
                  "bg-amber-50 border-amber-300 text-amber-900",
                  "bg-transparent",
                  "bg-rose-50 border-rose-300 text-rose-900",
                  "bg-cyan-50 border-cyan-300 text-cyan-900",
                  "bg-transparent",
                  "bg-blue-50 border-blue-300 text-blue-900",
                  "bg-lime-50 border-lime-300 text-lime-900",
                  "bg-transparent",
                ].map((c, i) => (
                  <div key={i} className={`h-12 rounded border ${c} ${c === "bg-transparent" ? "border-dashed border-slate-200" : "px-1 py-0.5"}`}>
                    {c !== "bg-transparent" && (
                      <>
                        <p className="font-bold leading-tight">{["ACC101", "BFN201", "MKT301", "MGT101", "CSC201", "LAW101"][i % 6]}</p>
                        <p className="opacity-70">LT{(i % 2) + 1}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-green-200 bg-white px-3 py-2 shadow-lg">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-green-100 text-green-600">✓</span>
              <span className="text-xs font-semibold text-slate-700">0 conflicts detected</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4">
          {[
            { icon: <IconBuilding />, value: stats.departments, label: "Departments" },
            { icon: <IconBook />, value: stats.courses, label: "Courses" },
            { icon: <IconUsers />, value: stats.lecturers, label: "Lecturers" },
            { icon: <IconCalendar />, value: stats.venues, label: "Venues" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-600">{s.icon}</span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Everything the registrar needs</h2>
          <p className="mt-3 text-slate-600">From the first lecturer request to the published timetable — one connected system.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:shadow-md">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">{f.icon}</span>
              <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-600 text-lg font-bold text-white">{s.n}</span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lecturer self-service space */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid items-center gap-8 rounded-3xl border border-brand-200 bg-brand-50/50 p-8 lg:grid-cols-2 lg:p-12">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                <IconSpark /> For lecturers
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
                Allocate your course in seconds
              </h2>
              <p className="mt-3 text-slate-600">
                Sign in, choose your course, and pick a slot. If it's free it's{" "}
                <strong className="text-slate-800">allocated instantly</strong>; if it's already
                taken it's declined — and our <strong className="text-slate-800">Smart Assistant</strong>{" "}
                shows you every free day and hour to choose from.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/lecturer/allocate" className="rounded-xl bg-brand-600 px-6 py-3 font-medium text-white shadow-sm transition hover:bg-brand-700">
                  Allocate my course
                </Link>
                <Link href="/login?next=/lecturer/allocate" className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 transition hover:bg-slate-50">
                  Lecturer sign in
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white"><IconSpark /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Smart Assistant</p>
                  <p className="text-[11px] text-slate-500">Free slots for MKT301</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  ["Monday", ["08:00–10:00 · LT1", "14:00–16:00 · Hall A"]],
                  ["Wednesday", ["10:00–12:00 · LT2", "16:00–18:00 · Room 101"]],
                  ["Friday", ["08:00–10:00 · Hall B"]],
                ].map(([day, chips]) => (
                  <div key={day as string}>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{day}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(chips as string[]).map((c) => (
                        <span key={c} className="rounded-lg border border-brand-200 bg-white px-2 py-1 text-[11px] font-medium text-brand-700">{c}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-brand-700 to-brand-500 px-8 py-12 text-center shadow-xl sm:px-16">
          <h2 className="text-3xl font-bold text-white">Ready to build a clash-free timetable?</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">
            Sign in to the {SCHOOL_SHORT} workspace, or explore the published class timetable — no login required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="rounded-xl bg-white px-6 py-3 font-medium text-brand-700 shadow-sm transition hover:bg-brand-50">Sign in</Link>
            <Link href="/timetable" className="rounded-xl border border-white/40 px-6 py-3 font-medium text-white transition hover:bg-white/10">Public timetable</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-[10px] font-bold text-white">{SCHOOL_SHORT}</span>
            <span>© {SCHOOL_NAME}</span>
          </div>
          <span>{APP_NAME} · Final-year project</span>
        </div>
      </footer>
    </div>
  );
}
