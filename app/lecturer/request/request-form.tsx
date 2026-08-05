"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { submitAllocationRequest, type SubmitState } from "./actions";
import { Card, CardBody, CardHeader, Field, Input, Select, Alert, Button } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DAYS, DAY_LABELS } from "@/lib/constants";
import type { ConflictResult, FreeSlot } from "@/lib/conflict/core";

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

export function RequestForm({
  sessionId,
  lecturerId,
  courses,
  venues,
}: {
  sessionId: number;
  lecturerId: number;
  courses: Option[];
  venues: Option[];
}) {
  const [state, formAction] = useFormState<SubmitState, FormData>(submitAllocationRequest, {});
  const [courseId, setCourseId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("");
  const [venueId, setVenueId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ConflictResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const complete = courseId && dayOfWeek && venueId && startTime && endTime;

  // Live conflict check — debounced, runs the same server checker as final submit.
  useEffect(() => {
    if (!complete) {
      setResult(null);
      return;
    }
    setChecking(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch("/api/conflict-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, courseId, lecturerId, venueId, dayOfWeek, startTime, endTime }),
          signal: ac.signal,
        });
        const data = (await res.json()) as ConflictResult;
        setResult(data);
      } catch (e: any) {
        if (e?.name !== "AbortError") setResult(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [complete, sessionId, courseId, lecturerId, venueId, dayOfWeek, startTime, endTime]);

  const applySuggestion = (s: FreeSlot) => {
    setDayOfWeek(s.dayOfWeek);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setVenueId(String(s.venueId));
  };

  const blocked = result != null && !result.ok;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <h2 className="font-semibold text-slate-800">Request an allocation</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick a course, day, time and venue. We check for clashes as you type.
          </p>
        </CardHeader>
        <CardBody>
          {state.error && (
            <Alert variant="error" className="mb-4">
              {state.error}
            </Alert>
          )}
          <form action={formAction}>
            <Field label="Course" htmlFor="courseId" hint="Teach across departments, so pick any course.">
              <Select id="courseId" name="courseId" required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <option value="" disabled>
                  Select a course…
                </option>
                {groupByDept(courses).map(([dept, list]) => (
                  <optgroup key={dept} label={dept}>
                    {list.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Day" htmlFor="dayOfWeek">
                <Select id="dayOfWeek" name="dayOfWeek" required value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                  <option value="" disabled>
                    Day…
                  </option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {DAY_LABELS[d]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Venue" htmlFor="venueId">
                <Select id="venueId" name="venueId" required value={venueId} onChange={(e) => setVenueId(e.target.value)}>
                  <option value="" disabled>
                    Venue…
                  </option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.capacity})
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start time" htmlFor="startTime">
                <Input id="startTime" name="startTime" type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </Field>
              <Field label="End time" htmlFor="endTime">
                <Input id="endTime" name="endTime" type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Field>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <SubmitButton pendingLabel="Submitting…" className={blocked ? "!bg-red-600 hover:!bg-red-700" : ""}>
                {blocked ? "Slot clashes, submission blocked" : "Submit request"}
              </SubmitButton>
              {checking && <span className="text-sm text-slate-400">Checking…</span>}
            </div>
            {blocked && (
              <p className="mt-2 text-xs text-red-500">
                Resolve the clash below (or pick a suggested slot) before submitting.
              </p>
            )}
          </form>
        </CardBody>
      </Card>

      {/* Live feedback panel */}
      <div className="lg:col-span-2">
        {!complete && (
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">
                Fill in the form to see live availability.
              </p>
            </CardBody>
          </Card>
        )}

        {complete && result && result.ok && (
          <Alert variant="success" title="This slot is free">
            No clashes detected. You can submit this request.
            {result.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-amber-700">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </Alert>
        )}

        {complete && result && !result.ok && (
          <Alert variant="error" title="Slot unavailable">
            <ul className="list-disc space-y-1 pl-5">
              {result.conflicts.map((c, i) => (
                <li key={i}>{c.message}</li>
              ))}
            </ul>
            {result.suggestions.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                  Nearest free slots
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      {DAY_LABELS[s.dayOfWeek as keyof typeof DAY_LABELS] ?? s.dayOfWeek} {s.startTime}–{s.endTime} · {s.venueName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Alert>
        )}
      </div>
    </div>
  );
}
