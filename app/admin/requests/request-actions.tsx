"use client";

import { useRef } from "react";

// Approve is a one-click form; Reject and Override collect a reason via a prompt and
// submit it with the server action.
type Action = (formData: FormData) => void | Promise<void>;

function PromptButton({
  action,
  id,
  label,
  promptText,
  className,
}: {
  action: Action;
  id: number;
  label: string;
  promptText: string;
  className: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const r = window.prompt(promptText);
        if (r === null) {
          e.preventDefault();
          return;
        }
        if (ref.current) ref.current.value = r;
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="reason" ref={ref} />
      <button className={className}>{label}</button>
    </form>
  );
}

export function RequestActions({
  id,
  approveAction,
  rejectAction,
  overrideAction,
}: {
  id: number;
  approveAction: Action;
  rejectAction: Action;
  overrideAction: Action;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <form action={approveAction}>
        <input type="hidden" name="id" value={id} />
        <button className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700">
          Approve
        </button>
      </form>
      <PromptButton
        action={rejectAction}
        id={id}
        label="Reject"
        promptText="Reason for rejecting this request:"
        className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50"
      />
      <PromptButton
        action={overrideAction}
        id={id}
        label="Override"
        promptText="Justification for overriding existing allocations:"
        className="rounded-md bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600"
      />
    </div>
  );
}
