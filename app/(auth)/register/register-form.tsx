"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { registerAction, type RegisterState } from "./actions";
import { Card, CardBody, CardHeader, Field, Input, Select, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initial: RegisterState = {};

export function RegisterForm({
  departments,
}: {
  departments: { id: number; name: string }[];
}) {
  const [state, formAction] = useFormState(registerAction, initial);
  const fe = state.fieldErrors ?? {};

  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold text-slate-900">Create a lecturer account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Register to submit and track your course allocations.
        </p>
      </CardHeader>
      <CardBody>
        {state.error ? (
          <Alert variant="error" className="mb-4">
            {state.error}
          </Alert>
        ) : null}
        <form action={formAction}>
          <Field label="Full name" htmlFor="name" error={fe.name}>
            <Input id="name" name="name" placeholder="Henrietta Insange" required />
          </Field>
          <Field label="Email" htmlFor="email" error={fe.email}>
            <Input id="email" name="email" type="email" placeholder="henrietta.insange@yibs.test" required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Staff ID" htmlFor="staffId" error={fe.staffId}>
              <Input id="staffId" name="staffId" placeholder="CSC/003" required />
            </Field>
            <Field label="Department" htmlFor="departmentId" error={fe.departmentId}>
              <Select id="departmentId" name="departmentId" required defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Phone (optional)" htmlFor="phone" error={fe.phone}>
            <Input id="phone" name="phone" placeholder="080..." />
          </Field>
          <Field label="Password" htmlFor="password" error={fe.password} hint="At least 6 characters.">
            <Input id="password" name="password" type="password" required />
          </Field>
          <SubmitButton className="w-full" pendingLabel="Creating account…">
            Create account
          </SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
