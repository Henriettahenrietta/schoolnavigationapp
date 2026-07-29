"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { loginAction, type LoginState } from "./actions";
import { Field, Input, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initial: LoginState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useFormState(loginAction, initial);

  return (
    <>
      {state.error && (
        <Alert variant="error" className="mb-4">
          {state.error}
        </Alert>
      )}
      <form action={formAction}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@yibs.test" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" required />
        </Field>
        <div className="mb-4 flex justify-end">
          <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>
        <SubmitButton className="w-full" pendingLabel="Signing in…">
          Sign in
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New lecturer?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Create an account
        </Link>
      </p>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="font-semibold text-slate-700">Admin</p>
          <p className="text-slate-500">admin@cas.test</p>
          <p className="text-slate-500">password</p>
        </div>
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-xs">
          <p className="font-semibold text-brand-700">Lecturer</p>
          <p className="text-slate-500">emmanuel.nkeng@yibs.test</p>
          <p className="text-slate-500">password</p>
        </div>
      </div>
    </>
  );
}
