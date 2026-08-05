import { PageHeader } from "@/components/page-header";
import { Alert } from "@/components/ui";

/**
 * Every HOD screen is scoped to one department, so a Head whose account has no
 * department attached gets this instead of an empty or, worse, unscoped page.
 */
export function NoDepartment({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Alert variant="warning" title="No department assigned">
        Your account is not attached to a department yet, so there is nothing to show here.
        Ask an administrator to set your department on the Lecturers screen.
      </Alert>
    </div>
  );
}
