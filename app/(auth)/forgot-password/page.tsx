"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { forgotAction, type ForgotState } from "./actions";
import { Card, CardBody, CardHeader, Field, Input, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initial: ForgotState = {};

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(forgotAction, initial);

  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Verify your identity with your email and staff ID.
        </p>
      </CardHeader>
      <CardBody>
        {state.error && (
          <Alert variant="error" className="mb-4">
            {state.error}
          </Alert>
        )}
        <form action={formAction}>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required />
          </Field>
          <Field label="Staff ID" htmlFor="staffId">
            <Input id="staffId" name="staffId" placeholder="CSC/001" required />
          </Field>
          <SubmitButton className="w-full" pendingLabel="Verifying…">
            Continue
          </SubmitButton>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
