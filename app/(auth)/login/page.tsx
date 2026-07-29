"use client";

import Link from "next/link";
import { useFormState } from "react-dom";
import { loginAction, type LoginState } from "./actions";
import { Card, CardBody, CardHeader, Field, Input, Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

const initial: LoginState = {};

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, initial);

  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          Access your admin or lecturer dashboard.
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
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@cas.test"
              required
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </Field>
          <div className="mb-4 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Forgot password?
            </Link>
          </div>
          <SubmitButton className="w-full" pendingLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New lecturer?{" "}
          <Link
            href="/register"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Create an account
          </Link>
        </p>

        <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-600">Demo logins</p>
          <p>admin@cas.test / password</p>
          <p>ada.obi@cas.test / password</p>
        </div>
      </CardBody>
    </Card>
  );
}
