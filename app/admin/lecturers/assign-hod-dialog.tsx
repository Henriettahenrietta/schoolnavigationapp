"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { assignHod } from "./actions";
import { Button, Field, Select, Alert } from "@/components/ui";
import { Modal } from "@/components/modal";
import { SubmitButton } from "@/components/submit-button";
import type { ActionState } from "@/lib/crud";

export type AssignDepartment = { id: number; name: string; headName: string | null };
export type AssignStaff = {
  id: number;
  name: string;
  role: string;
  departmentId: number | null;
  departmentName: string;
};

/**
 * Appoint a Head by choosing the department and the person in a single step. The
 * department picker leads, because that is the decision being made; the staff picker
 * then shows that department's own lecturers first while still allowing anyone else.
 */
export function AssignHodDialog({
  departments,
  staff,
}: {
  departments: AssignDepartment[];
  staff: AssignStaff[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState("");
  const [userId, setUserId] = useState("");
  const [state, formAction] = useFormState<ActionState, FormData>(assignHod, {});

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setDepartmentId("");
      setUserId("");
      router.refresh();
    }
  }, [state, router]);

  const selectedDepartment = departments.find((d) => String(d.id) === departmentId);
  const selectedStaff = staff.find((s) => String(s.id) === userId);

  const [inDepartment, elsewhere] = useMemo(() => {
    const chosen = departmentId ? Number(departmentId) : null;
    return [
      staff.filter((s) => chosen != null && s.departmentId === chosen),
      staff.filter((s) => chosen == null || s.departmentId !== chosen),
    ];
  }, [staff, departmentId]);

  // Consequences worth stating before the admin commits.
  const willReplace =
    selectedDepartment?.headName && selectedDepartment.headName !== selectedStaff?.name
      ? selectedDepartment.headName
      : null;
  const willMove =
    selectedStaff && selectedDepartment && selectedStaff.departmentId !== selectedDepartment.id
      ? selectedStaff.departmentName
      : null;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Assign HOD
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Assign a Head of Department">
        <form action={formAction}>
          {state.error && (
            <Alert variant="error" className="mb-4">
              {state.error}
            </Alert>
          )}

          <Field label="Department" htmlFor="departmentId">
            <Select
              id="departmentId"
              name="departmentId"
              required
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setUserId("");
              }}
            >
              <option value="" disabled>
                Select a department…
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.headName ? ` — currently ${d.headName}` : " — no Head yet"}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Head of Department"
            htmlFor="userId"
            hint={
              departmentId
                ? "Anyone can be chosen. Picking someone from another department moves them."
                : "Choose a department first."
            }
          >
            <Select
              id="userId"
              name="userId"
              required
              disabled={!departmentId}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="" disabled>
                Select a member of staff…
              </option>
              {inDepartment.length > 0 && (
                <optgroup label={`In ${selectedDepartment?.name ?? "this department"}`}>
                  {inDepartment.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.role === "hod" ? " (current Head)" : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {elsewhere.length > 0 && (
                <optgroup label="Other departments">
                  {elsewhere.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.departmentName}
                      {s.role === "hod" ? ", Head" : ""})
                    </option>
                  ))}
                </optgroup>
              )}
            </Select>
          </Field>

          {(willReplace || willMove) && (
            <Alert variant="warning" className="mb-4">
              <ul className="list-disc space-y-1 pl-5">
                {willReplace && (
                  <li>
                    <strong>{willReplace}</strong> will step down to lecturer.
                  </li>
                )}
                {willMove && (
                  <li>
                    <strong>{selectedStaff?.name}</strong> will move from {willMove} to{" "}
                    {selectedDepartment?.name}.
                  </li>
                )}
              </ul>
            </Alert>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Assigning…">Assign as HOD</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
