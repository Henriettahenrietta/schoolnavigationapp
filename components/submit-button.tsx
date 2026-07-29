"use client";

import { useFormStatus } from "react-dom";
import { Button } from "./ui";

// A submit button that shows a pending label while the enclosing form's server action
// runs. Uses the framework's useFormStatus, so no manual state wiring is needed.
export function SubmitButton({
  children,
  pendingLabel = "Please wait…",
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className={className}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
