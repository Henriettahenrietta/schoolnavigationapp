"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import Link from "next/link";
import { instantAllocate, type AllocateState } from "./actions";
import { Card, CardBody, CardHeader, Field, Select, Input, Alert, Button } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { IconSpark } from "@/components/icons";
import { DAYS, DAY_LABELS } from "@/lib/constants";
import type { FreeSlot } from "@/lib/conflict/core";

type Option = { id: number; code?: string; title?: string; name?: string; capacity?: number; departmentName?: string };

function groupByDept(courses: Option[]): [string, Option[]][] {
  const map = new Map<string, Option[]>();
  for (const c of courses) {
    const key = c.departmentName ?? "Courses";
    const arr = map.get(key) ?? [];
    arr.push(c);
    map.set(key, arr);
  }
  return [...map.entries()];
}

export function AllocateForm({
  courses,
  venues,
}: {
  courses: Option[];
  venues: Option[];
}) {
  const [state, formAction] = useFormState<AllocateState, FormData>(instantAllocate, {});
  const [courseId, setCourseId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [venueId, setVenueId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [slots, setSlots] = useState<FreeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Smart Assistant: when a course is picked, fetch its free slots for the week.
  useEffect(() => {
    if (!courseId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/free-slots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, duration: 120 }),
        });
        const data = await res.json();
        setSlots(data.slots ?? []);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [courseId]);

  const apply = (s: FreeSlot) => {
    setDayOfWeek(s.dayOfWeek);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setVenueId(String(s.venueId));
  };

  // Group free slots by day for the assistant.
  const byDay = new Map<string, FreeSlot[]>();
  for (const s of slots) {
    const arr = byDay.get(s.dayOfWeek) ?? [];
    if (arr.length < 4) arr.push(s); // keep the panel tidy
    byDay.set(s.dayOfWeek, arr);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Allocation form */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <h2 className="font-semibold text-slate-800">Allocate a course</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick your course and a slot. If it's free it's allocated instantly; if it's taken
            it's declined.
          </p>
        </CardHeader>
        <CardBody>
          {state.ok && state.allocated && (
            <Alert variant="success" title="Allocated 🎉" className="mb-4">
              <strong>{state.allocated.code}</strong> is now on your timetable:{" "}
              {DAY_LABELS[state.allocated.day as keyof typeof DAY_LABELS] ?? state.allocated.day}{" "}
              {state.allocated.start}–{state.allocated.end} in {state.allocated.venue}.{" "}
              <Link href="/lecturer/timetable" className="font-medium underline">
                View my timetable
              </Link>
            </Alert>
          )}
          {state.declined && (
            <Alert variant="error" title="Declined" className="mb-4">
              {state.message}
              {state.conflicts && state.conflicts.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {state.conflicts.map((c, i) => (
                    <li key={i}>{c.message}</li>
                  ))}
                </ul>
              )}
            </Alert>
          )}
          {state.error && (
            <Alert variant="error" className="mb-4">
              {state.error}
            </Alert>
          )}

          <form action={formAction}>
            <Field label="Course" htmlFor="courseId" hint="You can teach across departments — pick any course.">
              <Select id="courseId" name="courseId" required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="" disabled>
                  Select a course…
                </option>
                {groupByDept(courses).map(([dept, list]) => (
                  <optgroup key={dept} label={dept}>
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Day" htmlFor="dayOfWeek">
                <Select id="dayOfWeek" name="dayOfWeek" required value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                  <option value="" disabled>Day…</option>
                  {DAYS.map((d) => (<option key={d} value={d}>{DAY_LABELS[d]}</option>))}
                </Select>
              </Field>
              <Field label="Venue" htmlFor="venueId">
                <Select id="venueId" name="venueId" required value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                  <option value="" disabled>Venue…</option>
                  {venues.map((v) => (<option key={v.id} value={v.id}>{v.name} ({v.capacity})</option>))}
                </Select>
              </Field>
              <Field label="Start time" htmlFor="startTime">
                <Input id="startTime" name="startTime" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </Field>
              <Field label="End time" htmlFor="endTime">
                <Input id="endTime" name="endTime" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Field>
            </div>
            <SubmitButton pendingLabel="Allocating…">Allocate my course</SubmitButton>
          </form>
        </CardBody>
      </Card>

      {/* Smart Assistant */}
      <div className="lg:col-span-2">
        <Card className="border-brand-200">
          <CardHeader className="bg-brand-50/50">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
                <IconSpark />
              </span>
              <div>
                <h2 className="font-semibold text-slate-800">Smart Assistant</h2>
                <p className="text-xs text-slate-500">AI-suggested free days & hours</p>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {!courseId ? (
              <p className="text-sm text-slate-500">Select your course and I'll show every free slot this week.</p>
            ) : loadingSlots ? (
              <p className="text-sm text-slate-400">Finding free slots…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-slate-500">No free 2-hour slots found for this course this week.</p>
            ) : (
              <div className="space-y-3">
                {DAYS.filter((d) => byDay.has(d)).map((d) => (
                  <div key={d}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{DAY_LABELS[d]}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {byDay.get(d)!.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => apply(s)}
                          className="rounded-lg border border-brand-200 bg-white px-2.5 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50"
                          title={`${s.venueName}`}
                        >
                          {s.startTime}–{s.endTime}
                          <span className="ml-1 text-brand-400">· {s.venueName}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-xs text-slate-400">Click a slot to fill the form, then Allocate.</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
