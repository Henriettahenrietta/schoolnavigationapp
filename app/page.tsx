import Link from "next/link";
import { SCHOOL_NAME, APP_NAME } from "@/lib/branding";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
        {SCHOOL_NAME} · {APP_NAME}
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
        Conflict-free timetabling for {SCHOOL_NAME}
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Lecturers request slots, the system rejects clashes in real time, and admins
        generate a full conflict-free timetable with one click.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          Sign in
        </Link>
        <Link
          href="/timetable"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
        >
          View published timetable
        </Link>
      </div>

      <p className="mt-10 text-sm text-slate-500">
        Real-time clash detection · one-click automatic timetable generation · role-based
        access for admins, lecturers and students.
      </p>
    </main>
  );
}
