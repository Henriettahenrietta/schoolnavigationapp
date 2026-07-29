import { ZodError } from "zod";

// Shared types/helpers for the config-driven CRUD layer used by the admin modules.

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export const emptyState: ActionState = {};

/** Turn a ZodError into a flat { fieldName: message } map for the form UI. */
export function zodFieldErrors(err: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
