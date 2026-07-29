"use client";

import { useFormState } from "react-dom";
import { resetAction, type ResetState } from "./actions";
import { Field, Input, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initial: ResetState = {};

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useFormState(resetAction, initial);
  return (
    <form action={formAction}>
      {state.error && (
        <Alert variant="error" className="mb-4">
          {state.error}
        </Alert>
      )}
      <input type="hidden" name="token" value={token} />
      <Field label="New password" htmlFor="password" hint="At least 6 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Updating…">
        Set new password
      </SubmitButton>
    </form>
  );
}
