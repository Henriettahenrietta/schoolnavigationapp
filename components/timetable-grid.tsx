import { toMinutes } from "@/lib/time";
import { DAY_LABELS } from "@/lib/constants";

// Renders stored allocations as a real timetable: days as columns, time slots as rows.
// A multi-hour course occupies ONE merged block (rowSpan) rather than repeated cells.
// Used by the lecturer, master (admin) and public timetable views.

export type GridAllocation = {
  id: number;
  courseCode: string;
  courseTitle: string;
  lecturerName?: string;
  venueName?: string;
  departmentId?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  source?: string;
  isLocked?: boolean;
};

// Colour palette keyed by department id (stable, accessible-ish pastel set).
const PALETTE = [
  "bg-blue-50 border-blue-300 text-blue-900",
  "bg-emerald-50 border-emerald-300 text-emerald-900",
  "bg-violet-50 border-violet-300 text-violet-900",
  "bg-amber-50 border-amber-300 text-amber-900",
  "bg-rose-50 border-rose-300 text-rose-900",
  "bg-cyan-50 border-cyan-300 text-cyan-900",
  "bg-lime-50 border-lime-300 text-lime-900",
];
function colorFor(departmentId?: number): string {
  if (departmentId == null) return "bg-slate-50 border-slate-300 text-slate-800";
  return PALETTE[departmentId % PALETTE.length];
}

export function TimetableGrid({
  allocations,
  dayStart = "08:00",
  dayEnd = "18:00",
  slotMinutes = 60,
  days = ["mon", "tue", "wed", "thu", "fri"],
  showLecturer = true,
  showVenue = true,
}: {
  allocations: GridAllocation[];
  dayStart?: string;
  dayEnd?: string;
  slotMinutes?: number;
  days?: string[];
  showLecturer?: boolean;
  showVenue?: boolean;
}) {
  const startM = toMinutes(dayStart);
  const endM = toMinutes(dayEnd);
  const slots: number[] = [];
  for (let m = startM; m < endM; m += slotMinutes) slots.push(m);
  const idxOf = (m: number) => Math.round((m - startM) / slotMinutes);

  // Per-day: which slot a block starts at, and which slots are covered by a block above.
  const starts: Record<string, Record<number, GridAllocation & { span: number }>> = {};
  const covered: Record<string, Set<number>> = {};
  for (const d of days) {
    starts[d] = {};
    covered[d] = new Set();
  }
  for (const a of allocations) {
    if (!days.includes(a.dayOfWeek)) continue;
    const s = idxOf(toMinutes(a.startTime));
    const span = Math.max(1, Math.round((toMinutes(a.endTime) - toMinutes(a.startTime)) / slotMinutes));
    if (s < 0 || s >= slots.length) continue;
    starts[a.dayOfWeek][s] = { ...a, span };
    for (let i = s + 1; i < s + span && i < slots.length; i++) covered[a.dayOfWeek].add(i);
  }

  const fmtSlot = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="w-20 border-b border-r border-slate-200 px-2 py-2 text-left font-semibold">Time</th>
            {days.map((d) => (
              <th key={d} className="border-b border-slate-200 px-2 py-2 text-left font-semibold">
                {DAY_LABELS[d as keyof typeof DAY_LABELS] ?? d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((m, i) => (
            <tr key={m} className="h-12">
              <td className="border-r border-slate-200 px-2 align-top text-xs text-slate-400">
                {fmtSlot(m)}
              </td>
              {days.map((d) => {
                if (covered[d].has(i)) return null; // covered by a rowSpan above
                const block = starts[d][i];
                if (!block) {
                  return <td key={d} className="border-b border-l border-slate-100" />;
                }
                return (
                  <td
                    key={d}
                    rowSpan={block.span}
                    className="border-b border-l border-slate-100 p-1 align-top"
                  >
                    <div className={`h-full rounded-md border px-2 py-1 ${colorFor(block.departmentId)}`}>
                      <p className="text-xs font-semibold leading-tight">{block.courseCode}</p>
                      <p className="truncate text-[11px] leading-tight opacity-80">{block.courseTitle}</p>
                      {showVenue && block.venueName && (
                        <p className="mt-0.5 text-[11px] leading-tight opacity-70">📍 {block.venueName}</p>
                      )}
                      {showLecturer && block.lecturerName && (
                        <p className="text-[11px] leading-tight opacity-70">{block.lecturerName}</p>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
