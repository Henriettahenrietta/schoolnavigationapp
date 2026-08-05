"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { saveAllocation, deleteAllocation, type AllocState } from "./actions";
import { Button, Field, Select, Input, Alert } from "@/components/ui";
import { Modal } from "@/components/modal";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/table";
import { DAYS, DAY_LABELS } from "@/lib/constants";
import type { FreeSlot } from "@/lib/conflict/core";

type Course = { id: number; code: string; title: string; departmentName: string };
type Lecturer = { id: number; name: string; departmentName: string };
type Venue = { id: number; name: string; capacity: number };
export type AllocRow = {
  id: number;
  courseId: number; courseCode: string; courseTitle: string;
  lecturerId: number; lecturerName: string;
  venueId: number; venueName: string;
  dayOfWeek: string; startTime: string; endTime: string;
};

export function AllocationsManager({
  rows, courses, lecturers, venues,
}: {
  rows: AllocRow[]; courses: Course[]; lecturers: Lecturer[]; venues: Venue[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AllocRow | null>(null);
  const [state, formAction] = useFormState<AllocState, FormData>(saveAllocation, {});

  // controlled values so suggestion chips can fill the form
  const [courseId, setCourseId] = useState("");
  const [lecturerId, setLecturerId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [day, setDay] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setEditing(null);
      router.refresh();
    }
  }, [state, router]);

  const openAdd = () => {
    setEditing(null);
    setCourseId(""); setLecturerId(""); setVenueId(""); setDay(""); setStart(""); setEnd("");
    setOpen(true);
  };
  const openEdit = (r: AllocRow) => {
    setEditing(r);
    setCourseId(String(r.courseId)); setLecturerId(String(r.lecturerId)); setVenueId(String(r.venueId));
    setDay(r.dayOfWeek); setStart(r.startTime); setEnd(r.endTime);
    setOpen(true);
  };
  const applySuggestion = (s: FreeSlot) => {
    setDay(s.dayOfWeek); setStart(s.startTime); setEnd(s.endTime); setVenueId(String(s.venueId));
  };

  return (
    <>
      <PageHeader
        title="Manage classes"
        subtitle="Add a class, replace a lecturer, or move a slot. Every change is conflict-checked."
        action={<Button onClick={openAdd}>+ Add class</Button>}
      />

      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH>Course</TH><TH>Lecturer</TH><TH>Day</TH><TH>Time</TH><TH>Venue</TH><TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={6}>No classes yet. Click “Add class”.</EmptyRow>
          ) : (
            rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-medium text-slate-800">{r.courseCode} · {r.courseTitle}</TD>
                <TD>{r.lecturerName}</TD>
                <TD>{DAY_LABELS[r.dayOfWeek as keyof typeof DAY_LABELS] ?? r.dayOfWeek}</TD>
                <TD>{r.startTime}–{r.endTime}</TD>
                <TD>{r.venueName}</TD>
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => openEdit(r)} className="text-sm font-medium text-brand-600 hover:text-brand-700">
                      Edit / replace
                    </button>
                    <form action={deleteAllocation} onSubmit={(e) => { if (!confirm("Remove this class?")) e.preventDefault(); else setTimeout(() => router.refresh(), 400); }}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-sm font-medium text-red-600 hover:text-red-700">Delete</button>
                    </form>
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit class" : "Add class"}>
        <form action={formAction}>
          {state.error && (
            <Alert variant="error" className="mb-4">
              {state.error}
              {state.conflicts && state.conflicts.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {state.conflicts.map((c, i) => (<li key={i}>{c.message}</li>))}
                </ul>
              )}
              {state.suggestions && state.suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {state.suggestions.map((s, i) => (
                    <button key={i} type="button" onClick={() => applySuggestion(s)}
                      className="rounded border border-red-200 bg-white px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50">
                      {DAY_LABELS[s.dayOfWeek as keyof typeof DAY_LABELS] ?? s.dayOfWeek} {s.startTime}–{s.endTime} · {s.venueName}
                    </button>
                  ))}
                </div>
              )}
            </Alert>
          )}
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <Field label="Course" htmlFor="courseId">
            <Select id="courseId" name="courseId" required value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="" disabled>Select a course…</option>
              {courses.map((c) => (<option key={c.id} value={c.id}>{c.code} · {c.title} ({c.departmentName})</option>))}
            </Select>
          </Field>
          <Field label="Lecturer" htmlFor="lecturerId" hint="Change this to replace the teacher.">
            <Select id="lecturerId" name="lecturerId" required value={lecturerId} onChange={(e) => setLecturerId(e.target.value)}>
              <option value="" disabled>Select a lecturer…</option>
              {lecturers.map((l) => (<option key={l.id} value={l.id}>{l.name} ({l.departmentName})</option>))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Day" htmlFor="dayOfWeek">
              <Select id="dayOfWeek" name="dayOfWeek" required value={day} onChange={(e) => setDay(e.target.value)}>
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
              <Input id="startTime" name="startTime" type="time" required value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="End time" htmlFor="endTime">
              <Input id="endTime" name="endTime" type="time" required value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton pendingLabel="Saving…">{editing ? "Save changes" : "Add class"}</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
