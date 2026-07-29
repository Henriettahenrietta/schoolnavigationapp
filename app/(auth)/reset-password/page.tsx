import Link from "next/link";
import { Card, CardBody, CardHeader, Alert } from "@/components/ui";
import { verifyResetToken } from "@/lib/auth/reset";
import { ResetForm } from "./reset-form";

// Server component: validate the reset token from the URL before showing the form.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";
  const userId = token ? await verifyResetToken(token) : null;

  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold text-slate-900">Choose a new password</h1>
      </CardHeader>
      <CardBody>
        {!userId ? (
          <>
            <Alert variant="error">
              This reset link is invalid or has expired.
            </Alert>
            <p className="mt-4 text-center text-sm text-slate-500">
              <Link
                href="/forgot-password"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Start over
              </Link>
            </p>
          </>
        ) : (
          <ResetForm token={token} />
        )}
      </CardBody>
    </Card>
  );
}
