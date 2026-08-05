# YIBS Course Allocation System (CAS)

A conflict-aware course-allocation and automatic timetable-generation system for
**Yaounde International Business School (YIBS)**. Lecturers request teaching slots and the
system rejects clashes in **real time**; admins approve requests and can generate an entire
**conflict-free timetable with one click**, then publish and export it.

Built with **Next.js 14 (App Router) · Prisma · PostgreSQL (Neon) · Tailwind CSS**
(TypeScript). Image uploads use **Cloudinary**. The database is cloud-hosted, so there is
**no database server to install** locally.

---

## Features

**Admin**
- CRUD for sessions, departments, programmes, courses, venues, lecturers and system settings
- Approve / reject (with reason) / **override** allocation requests, with every override logged
- **One-click automatic timetable generation** (fill or full mode, repeatable by seed) with a
  draft preview, unplaced-courses report, accept / discard / roll back
- **Master timetable** grid with filters (department, level, venue, lecturer, day)
- **Reports** (allocations per department, venue utilisation, lecturer workload)
- **Publish / unpublish** the timetable; **CSV** and **Print/PDF** export; **audit log**

**Lecturer**
- Submit allocation requests with **live conflict feedback** and one-click free-slot suggestions
- View own timetable and weekly workload, track request history, manage availability
- In-app notifications on approval / rejection / override

**Public** (no login): pick a department + level and view the **published** class timetable (printable).

## The two core engines

- **`AllocationConflictChecker`** (`lib/conflict/`): the interval-overlap rule plus the four
  conflict types (class, lecturer, venue, policy) and free-slot suggestions.
- **`TimetableGenerator`** (`lib/generator/`): greedy placement, most-constrained-first
  ordering, deterministic by seed, self-audits to zero conflicts.

Both share the **exact same checking code**, so manual submissions and generated placements
can never disagree. See [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

---

## Requirements

- **Node.js 18+** (developed on Node 24) and npm.
- A PostgreSQL URL (this project uses a free **Neon** database) and, for image uploads, a
  **Cloudinary** account.

## Environment

Copy `.env.example` to `.env` and fill in your own values (`.env` is git-ignored):

```bash
cp .env.example .env
```

- `DATABASE_URL` / `DIRECT_URL`: Neon pooled and direct connection strings.
- `SESSION_SECRET`: any long random string.
- `CLOUDINARY_*`: from your Cloudinary dashboard (upload preset: `allocation`).

## Setup

```bash
npm install                       # install dependencies
npx prisma migrate deploy         # apply migrations to your database
npx prisma db seed                # seed demo data
npm run dev                       # start at http://localhost:3000
```

Wipe & rebuild the database at any time: `npm run db:reset`.

## Demo logins

| Role | Email | Password |
|---|---|---|
| Admin | `admin@cas.test` | `password` |
| Lecturer | `ada.obi@cas.test` | `password` |

All six seeded lecturers use `password`. The public timetable at `/timetable` needs no login.

The seed creates 1 active session (**2025/2026**), 3 departments, 8 venues, 40 courses, 6
lecturers with availability, and 20 approved allocations, leaving 20 unallocated for a live
**Generate Timetable** demo.

## Tests

```bash
npm run test
```

Runs the conflict-engine suite (interval overlaps, all four conflict types, policy rules,
cancelled-don't-block, suggestions) and the generator suite (zero-conflict run, same-seed
determinism, locked-preserved, impossible-course-unplaced).

## Project structure

```
app/                     Next.js App Router
  (auth)/                login, register, forgot/reset password
  admin/                 dashboard, CRUD, requests, generate, timetable, reports, audit, settings
  lecturer/              dashboard, request, requests, timetable, availability, notifications
  timetable/             public published view
  api/                   conflict-check (live), export/timetable (CSV)
lib/
  conflict/              AllocationConflictChecker (core + Prisma wrapper)
  generator/             TimetableGenerator (core + Prisma wrapper)
  auth/                  sessions (JWT), passwords (bcrypt), guards, rate-limit, reset
  prisma.ts branding.ts validation.ts time.ts constants.ts …
components/              UI kit, dashboard shell, timetable grid, CRUD engine
prisma/                  schema.prisma, seed.ts, migrations/
docs/                    ER-diagram.md, METHODOLOGY.md
tests/                   conflict.test.ts, generator.test.ts
DEFENSE_DEMO.md          step-by-step defense walkthrough
```

## Deliverables

- **ER diagram + use-case list**: [docs/ER-diagram.md](docs/ER-diagram.md)
- **Methodology write-up** (overlap rule, conflict types, heuristics, NP-hardness, complexity,
  flowchart): [docs/METHODOLOGY.md](docs/METHODOLOGY.md)
- **Defense demo script**: [DEFENSE_DEMO.md](DEFENSE_DEMO.md)

## Security & resilience notes

- Passwords hashed with **bcrypt**; sessions are signed **JWT** httpOnly cookies with an
  8-hour timeout; **role-based** middleware + server-side guards; **login rate-limiting**;
  Server-Action **CSRF** protection; Zod validation on every input; final allocation inserts
  run inside a **transaction** that re-checks for clashes (race-safe).
- The Prisma client automatically **retries transient database connection errors**, which
  smooths over an unreliable network link to the cloud database.

## Troubleshooting

- **`@prisma/client` did not initialize**: run `npx prisma generate`.
- **Want a clean slate**: `npm run db:reset`.
- **Port 3000 in use**: `npm run dev -- -p 3001`.
- **"Can't reach database server"**: a transient link blip to Neon; the client retries, or
  just refresh. A stable network is recommended for the live defense.
