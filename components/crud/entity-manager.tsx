"use client";

import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Alert } from "@/components/ui";
import { Modal } from "@/components/modal";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/page-header";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/table";
import type { ActionState } from "@/lib/crud";

export type FieldType =
  | "text"
  | "number"
  | "email"
  | "password"
  | "select"
  | "checkbox"
  | "time"
  | "date";

export type CrudField = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: { value: string | number; label: string }[];
  fullWidth?: boolean;
  /** Default used when creating (not editing) — e.g. a checkbox that starts checked. */
  defaultValue?: string | number | boolean;
};

export type CrudColumn = {
  key: string;
  label: string;
  className?: string;
};

export type Row = Record<string, any> & { id: number };

type SaveAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;
type DeleteAction = (formData: FormData) => void | Promise<void>;

/**
 * An optional extra button on every row, beside Edit and Delete. The label and the
 * confirmation text are read from the row itself rather than passed as callbacks,
 * because a server component cannot hand a function across to a client component;
 * server actions are the one exception, which is why `action` may be passed directly.
 * A row whose `labelKey` is empty simply gets no button.
 */
export type RowAction = {
  action: DeleteAction;
  labelKey: string;
  confirmKey?: string;
  className?: string;
};

export function EntityManager({
  title,
  subtitle,
  resource,
  columns,
  fields,
  rows,
  saveAction,
  deleteAction,
  canDelete = true,
  rowAction,
}: {
  title: string;
  subtitle?: string;
  resource: string;
  columns: CrudColumn[];
  fields: CrudField[];
  rows: Row[];
  saveAction: SaveAction;
  deleteAction?: DeleteAction;
  canDelete?: boolean;
  rowAction?: RowAction;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [state, formAction] = useFormState(saveAction, {} as ActionState);

  // Close + refresh whenever a save succeeds (fires only on a new action result).
  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      setEditing(null);
      router.refresh();
    }
  }, [state, router]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: Row) => {
    setEditing(row);
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={<Button onClick={openCreate}>+ New {resource}</Button>}
      />

      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            {columns.map((c) => (
              <TH key={c.key} className={c.className}>
                {c.label}
              </TH>
            ))}
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={columns.length + 1}>
              No {resource.toLowerCase()}s yet. Click “New {resource}” to add one.
            </EmptyRow>
          ) : (
            rows.map((row) => (
              <TR key={row.id}>
                {columns.map((c) => (
                  <TD key={c.key} className={c.className}>
                    {row[c.key] ?? "—"}
                  </TD>
                ))}
                <TD className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => openEdit(row)}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Edit
                    </button>
                    {rowAction && row[rowAction.labelKey] && (
                      <form
                        action={rowAction.action}
                        onSubmit={(e) => {
                          const message = rowAction.confirmKey ? row[rowAction.confirmKey] : null;
                          if (message && !confirm(message)) e.preventDefault();
                          else setTimeout(() => router.refresh(), 400);
                        }}
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          className={
                            rowAction.className ??
                            "text-sm font-medium text-slate-600 hover:text-slate-900"
                          }
                        >
                          {row[rowAction.labelKey]}
                        </button>
                      </form>
                    )}
                    {canDelete && deleteAction && (
                      <form
                        action={deleteAction}
                        onSubmit={(e) => {
                          if (!confirm(`Delete this ${resource.toLowerCase()}? This cannot be undone.`))
                            e.preventDefault();
                          else setTimeout(() => router.refresh(), 400);
                        }}
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <button className="text-sm font-medium text-red-600 hover:text-red-700">
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${resource}` : `New ${resource}`}
      >
        {/* Remount the form when switching rows so defaultValues refresh. */}
        <form action={formAction} key={editing?.id ?? "new"}>
          {state.error && (
            <Alert variant="error" className="mb-4">
              {state.error}
            </Alert>
          )}
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div className="grid grid-cols-2 gap-x-4">
            {fields.map((f) => (
              <div key={f.name} className={f.fullWidth ? "col-span-2" : "col-span-2 sm:col-span-1"}>
                <Field label={f.label} htmlFor={f.name} error={state.fieldErrors?.[f.name]} hint={f.hint}>
                  {f.type === "select" ? (
                    <Select
                      id={f.name}
                      name={f.name}
                      required={f.required}
                      defaultValue={editing?.[f.name] ?? ""}
                    >
                      <option value="" disabled>
                        Select…
                      </option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  ) : f.type === "checkbox" ? (
                    <label className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        name={f.name}
                        value="true"
                        defaultChecked={editing ? Boolean(editing[f.name]) : Boolean(f.defaultValue)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      {f.placeholder ?? "Enabled"}
                    </label>
                  ) : (
                    <Input
                      id={f.name}
                      name={f.name}
                      type={
                        f.type === "time"
                          ? "time"
                          : f.type === "date"
                            ? "date"
                            : f.type === "number"
                              ? "number"
                              : f.type === "email"
                                ? "email"
                                : f.type === "password"
                                  ? "password"
                                  : "text"
                      }
                      required={f.required}
                      placeholder={f.placeholder}
                      defaultValue={editing?.[f.name] ?? ""}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton pendingLabel="Saving…">
              {editing ? "Save changes" : `Create ${resource}`}
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
