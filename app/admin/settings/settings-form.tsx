"use client";

import { useFormState } from "react-dom";
import { updateSettings } from "./actions";
import { Card, CardBody, CardHeader, Field, Input, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { DAYS, DAY_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/crud";

export type SettingsValues = {
  dayStartTime: string;
  dayEndTime: string;
  slotDurationMinutes: number;
  workingDays: string[];
  maxWeeklyHoursPerLecturer: number;
  allowOverrides: boolean;
  lunchStart: string;
  lunchEnd: string;
  maxConsecutiveHours: number;
};

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, formAction] = useFormState<ActionState, FormData>(updateSettings, {});
  const fe = state.fieldErrors ?? {};

  return (
    <form action={formAction}>
      {state.ok && (
        <Alert variant="success" className="mb-4">
          Settings saved.
        </Alert>
      )}
      {state.error && (
        <Alert variant="error" className="mb-4">
          {state.error}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800">Teaching day</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Day start" htmlFor="dayStartTime" error={fe.dayStartTime}>
                <Input id="dayStartTime" name="dayStartTime" type="time" defaultValue={values.dayStartTime} required />
              </Field>
              <Field label="Day end" htmlFor="dayEndTime" error={fe.dayEndTime}>
                <Input id="dayEndTime" name="dayEndTime" type="time" defaultValue={values.dayEndTime} required />
              </Field>
              <Field label="Lunch start" htmlFor="lunchStart" error={fe.lunchStart}>
                <Input id="lunchStart" name="lunchStart" type="time" defaultValue={values.lunchStart} required />
              </Field>
              <Field label="Lunch end" htmlFor="lunchEnd" error={fe.lunchEnd}>
                <Input id="lunchEnd" name="lunchEnd" type="time" defaultValue={values.lunchEnd} required />
              </Field>
            </div>
            <Field label="Working days" error={fe.workingDays}>
              <div className="flex flex-wrap gap-3">
                {DAYS.map((d) => (
                  <label key={d} className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      name="workingDays"
                      value={d}
                      defaultChecked={values.workingDays.includes(d)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    {DAY_LABELS[d]}
                  </label>
                ))}
              </div>
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-semibold text-slate-800">Slots & policy</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Slot length (min)" htmlFor="slotDurationMinutes" error={fe.slotDurationMinutes}>
                <Input id="slotDurationMinutes" name="slotDurationMinutes" type="number" defaultValue={values.slotDurationMinutes} required />
              </Field>
              <Field label="Max consecutive hrs" htmlFor="maxConsecutiveHours" error={fe.maxConsecutiveHours}>
                <Input id="maxConsecutiveHours" name="maxConsecutiveHours" type="number" defaultValue={values.maxConsecutiveHours} required />
              </Field>
              <Field label="Max weekly hrs / lecturer" htmlFor="maxWeeklyHoursPerLecturer" error={fe.maxWeeklyHoursPerLecturer}>
                <Input id="maxWeeklyHoursPerLecturer" name="maxWeeklyHoursPerLecturer" type="number" defaultValue={values.maxWeeklyHoursPerLecturer} required />
              </Field>
            </div>
            <Field label="Overrides">
              <label className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  name="allowOverrides"
                  value="true"
                  defaultChecked={values.allowOverrides}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Allow admins to override existing allocations
              </label>
            </Field>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
      </div>
    </form>
  );
}
