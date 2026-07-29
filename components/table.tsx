import { cn } from "@/lib/cn";

// Minimal styled table primitives used across the CRUD screens.
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className={cn("w-full text-left text-sm", className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
      {children}
    </thead>
  );
}

export function TH({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-semibold", className)}>{children}</th>;
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TR({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("hover:bg-slate-50/70", className)}>{children}</tr>;
}

export function TD({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-slate-700", className)}>{children}</td>;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-400">
        {children}
      </td>
    </tr>
  );
}
