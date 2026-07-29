# YIBS Course Allocation System — Defense Demo Script

A step-by-step walkthrough for the project defense. Follow it top to bottom; each step lists
exactly what to click and the expected on-screen result.

**Before you start**

```bash
npm run dev          # start the app at http://localhost:3000
```

Have two logins ready:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@cas.test` | `password` |
| Lecturer | `ada.obi@cas.test` | `password` |

> Tip: run `npm run db:reset` beforehand for a clean, predictable dataset (1 active session
> `2025/2026`, 3 departments, 8 venues, 40 courses, 20 approved allocations, 20 unallocated).

---

## 1. A successful allocation

1. Sign in as **lecturer** (`ada.obi@cas.test`).
2. Sidebar → **Request allocation**.
3. Choose a course, **Day = Wednesday**, **Start 14:00 / End 16:00**, a large **Venue** (e.g. LT1).
4. **Expected:** the right-hand panel turns **green — "This slot is free."** Click **Submit request**.
5. **Expected:** you land on **My requests** with a green banner; the new row shows status **pending**.

## 2. A declined allocation — one for each conflict type

Still on **Request allocation**, reproduce each clash. As soon as day/time/venue are set the
panel updates live (no submit needed).

- **(a) Class / student-group clash** — pick a course whose department+level already has a
  class at that time (e.g. a 100-level course on **MON 08:00–10:00**).
  **Expected:** red panel — *"Declined — MON 08:00–10:00 is already allocated to CSC101 … for 100 Level."*
- **(b) Lecturer clash** — choose a slot where you (the lecturer) already teach.
  **Expected:** red panel — *"…this lecturer already teaches … on …"*
- **(c) Venue clash** — pick a venue already occupied at that time.
  **Expected:** red panel — *"… is occupied by … Free venues at that time: …"* plus **suggested free-slot chips**.
- **(d) Policy violation** — set **End time before Start time**, or a slot **outside 08:00–18:00**.
  **Expected:** red panel — *"End time must be after start time"* / *"…within the teaching day…"*.
- Click any **suggested slot chip** → the form fills with a conflict-free slot and the panel turns green.

## 3. Admin approves, rejects and overrides

1. Sign out, sign in as **admin** (`admin@cas.test`).
2. Sidebar → **Requests**. You'll see the pending request from step 1.
3. **Approve** it → **Expected:** the row disappears; the lecturer gets a notification (check
   under the lecturer's **Notifications**).
4. Submit another clashing pending request (repeat step 1 with a busy slot via the lecturer),
   then back as admin click **Override** → enter a justification.
   **Expected:** the request is approved, the previously-approved conflicting class is bumped to
   **declined** with reason *"Overridden by admin: …"*, and both lecturers are notified. The
   action appears in **Audit log**.

## 4. Live automatic timetable generation

1. As admin, sidebar → **Generate timetable**.
2. Mode **Fill**, optional **Seed = 42**, click **Generate timetable**.
3. **Expected:** a report appears — **Placed 20/20**, **Unplaced 0**, **Quality ~93/100**, runtime in ms,
   and a green banner: **"Self-audit: 0 conflicts detected."** The **draft preview grid** shows the
   newly-placed classes; the **Unplaced courses** panel lists any that couldn't be placed with reasons.

## 5. A manual edit that gets rejected

1. (Optional, to show the same rules apply to admin edits) Try to re-request or move a class into
   an occupied slot from the lecturer's **Request allocation** form while logged in as that lecturer.
2. **Expected:** the live checker rejects it with the same red panel — the generator and manual
   editing share the **exact same conflict rules**, so neither can ever produce a clash.

## 6. Publish and export the final timetable

1. As admin, click **Accept & approve** on the generate page → drafts become approved.
2. Sidebar → **Master timetable** — the full colour-coded grid. Try the **filters** (department, level,
   venue, lecturer, day).
3. Click **Publish** → the badge switches to **Published**.
4. Click **Export CSV** (opens in Excel) and **Print / PDF** (choose *Save as PDF* — note the
   YIBS header on the printout).
5. Open a new tab at **`/timetable`** (no login) → pick a **department + level** → the published
   class timetable renders, printable.
6. Sidebar → **Reports** → show allocations per department, venue utilisation %, and lecturer
   workload; export those too.

---

**One-line summary for the panel:** *lecturers request slots and the system rejects clashes in
real time; the admin generates a full conflict-free timetable in one click, reviews it, and
publishes it — all four conflict types and both entry paths run through a single shared engine.*
