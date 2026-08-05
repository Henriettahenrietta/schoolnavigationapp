import Link from "next/link";
import { getCurrentUser, homePathForRole } from "@/lib/auth/current-user";
import { Card, CardBody, CardHeader, Alert } from "@/components/ui";
import type { Role } from "@/lib/constants";
import { LoginForm } from "./login-form";

// Server component: if someone is already signed in (e.g. as admin) we DON'T bounce them —
// we show who they are with a sign-out, so they can switch to a lecturer account.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const user = await getCurrentUser();
  const next = searchParams.next;

  return (
    <Card>
      <CardHeader>
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Access your admin, HOD or lecturer dashboard.</p>
      </CardHeader>
      <CardBody>
        {user && (
          <Alert variant="info" className="mb-4">
            You're already signed in as <strong>{user.name}</strong> ({user.role}).
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={homePathForRole(user.role as Role)}
                className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
              >
                Go to my dashboard
              </Link>
              <form action="/logout" method="post">
                <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  Sign out
                </button>
              </form>
            </div>
            <p className="mt-2 text-xs">To use a lecturer feature, sign out and sign in with a lecturer account below.</p>
          </Alert>
        )}
        <LoginForm next={next} />
      </CardBody>
    </Card>
  );
}
