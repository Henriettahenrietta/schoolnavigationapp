// Time helpers. Times are stored as "HH:MM" 24-hour strings; all interval math is
// done in integer "minutes since midnight" to avoid any floating-point or Date/timezone
// pitfalls. This module is the arithmetic foundation of the conflict engine (Phase 4).

/** Convert "HH:MM" to minutes since midnight. Throws on malformed input. */
export function toMinutes(hhmm: string): number {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) throw new Error(`Invalid time "${hhmm}" (expected HH:MM)`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new Error(`Invalid time "${hhmm}"`);
  return h * 60 + min;
}

/** Convert minutes since midnight back to "HH:MM". */
export function toHHMM(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/**
 * The interval-overlap rule at the heart of the whole system.
 * Two same-day slots overlap when:  aStart < bEnd  AND  aEnd > bStart.
 * Touching edges (08:00–10:00 and 10:00–12:00) do NOT overlap.
 * Accepts either "HH:MM" strings or minute numbers.
 */
export function overlaps(
  aStart: string | number,
  aEnd: string | number,
  bStart: string | number,
  bEnd: string | number,
): boolean {
  const as = typeof aStart === "string" ? toMinutes(aStart) : aStart;
  const ae = typeof aEnd === "string" ? toMinutes(aEnd) : aEnd;
  const bs = typeof bStart === "string" ? toMinutes(bStart) : bStart;
  const be = typeof bEnd === "string" ? toMinutes(bEnd) : bEnd;
  return as < be && ae > bs;
}

/** Duration of a slot in minutes. */
export function durationMinutes(start: string, end: string): number {
  return toMinutes(end) - toMinutes(start);
}

/** Human-friendly range, e.g. "10:00–12:00". */
export function formatRange(start: string, end: string): string {
  return `${start}–${end}`;
}
