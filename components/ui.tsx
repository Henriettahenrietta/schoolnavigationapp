import * as React from "react";
import { cn } from "@/lib/cn";

// A small, consistent component kit (Tailwind). One file keeps the design system tidy.

// ---- Button ----------------------------------------------------------------
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 focus-visible:ring-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-slate-300",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

// ---- Input / Label / Field -------------------------------------------------
export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:bg-slate-50",
        className,
      )}
      {...props}
    />
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1 block text-sm font-medium text-slate-700", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      {label && <Label htmlFor={htmlFor}>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

// ---- Card ------------------------------------------------------------------
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-b border-slate-100 p-5", className)} {...props} />;
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

// ---- Alert -----------------------------------------------------------------
export function Alert({
  variant = "info",
  title,
  children,
  className,
}: {
  variant?: "info" | "success" | "error" | "warning";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const styles: Record<string, string> = {
    info: "border-brand-200 bg-brand-50 text-brand-800",
    success: "border-green-200 bg-green-50 text-green-800",
    error: "border-red-200 bg-red-50 text-red-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", styles[variant], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-1")}>{children}</div>}
    </div>
  );
}

// ---- Badge -----------------------------------------------------------------
export function Badge({
  variant = "slate",
  children,
  className,
}: {
  variant?: "slate" | "green" | "amber" | "red" | "blue";
  children: React.ReactNode;
  className?: string;
}) {
  const styles: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-brand-100 text-brand-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
